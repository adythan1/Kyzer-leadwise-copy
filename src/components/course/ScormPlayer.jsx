
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Download, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCourseStore } from '@/store/courseStore';
import { supabase } from '@/lib/supabase';
import { SCORMPackageParser } from '@/lib/scormParser';

const MAX_SCORM_FULL_EXTRACT_BYTES = 12 * 1024 * 1024;
const MAX_SCORM_FULL_EXTRACT_FILES = 320;
const MAX_ASSET_REGEX_ITERATIONS = 1200;

function normalizeZipPath(p) {
  return String(p || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
}

/** ZIP paths are case-sensitive; manifests often mismatch casing. */
function getZipEntry(zip, path) {
  const n = normalizeZipPath(path);
  if (zip.files[n]) {
    return { entry: zip.files[n], key: n };
  }
  const lower = n.toLowerCase();
  const foundKey = Object.keys(zip.files).find(
    (k) => !zip.files[k].dir && normalizeZipPath(k).toLowerCase() === lower
  );
  return foundKey ? { entry: zip.files[foundKey], key: foundKey } : { entry: null, key: null };
}

async function extractAllZipFilesToMap(zipContent, zipBlobSize, options) {
  const { mountedRef, setLoadingStep } = options;
  const allPaths = Object.keys(zipContent.files).filter((p) => !zipContent.files[p].dir);
  const useFull =
    zipBlobSize <= MAX_SCORM_FULL_EXTRACT_BYTES && allPaths.length <= MAX_SCORM_FULL_EXTRACT_FILES;

  const fileMap = {};
  const blobUrlsToCleanup = [];

  if (!useFull) {
    return { fileMap, blobUrlsToCleanup, mode: 'selective' };
  }

  setLoadingStep(`Unpacking package (${allPaths.length} files)…`);

  const textLike = new Set(['css', 'js', 'html', 'htm', 'xhtml', 'xml', 'json', 'txt', 'svg', 'swf']);
  let index = 0;
  const concurrency = Math.min(10, Math.max(1, allPaths.length));

  async function worker() {
    while (index < allPaths.length) {
      if (!mountedRef.current) return;
      const i = index++;
      const path = allPaths[i];
      const zf = zipContent.files[path];
      if (!zf || zf.dir) continue;
      const normKey = normalizeZipPath(path);
      try {
        const ext = normKey.split('.').pop()?.toLowerCase() || '';
        let blob;
        if (textLike.has(ext)) {
          const text = await zf.async('text');
          const mime =
            ext === 'css'
              ? 'text/css'
              : ext === 'js'
                ? 'application/javascript'
                : ext === 'html' || ext === 'htm' || ext === 'xhtml'
                  ? 'text/html'
                  : ext === 'svg'
                    ? 'image/svg+xml'
                    : 'application/octet-stream';
          blob = new Blob([text], { type: mime });
        } else {
          blob = await zf.async('blob');
        }
        const u = URL.createObjectURL(blob);
        fileMap[normKey] = u;
        blobUrlsToCleanup.push(u);
      } catch {
        /* skip bad entry */
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return { fileMap, blobUrlsToCleanup, mode: 'full' };
}

/** Aligns with paths stored in fileMap (entry dir usually ends with /). */
function resolveAssetPathToZipKey(entryDir, rawPath) {
  const filePath = String(rawPath || '').trim();
  if (
    !filePath ||
    /^https?:\/\//i.test(filePath) ||
    filePath.startsWith('data:') ||
    filePath.startsWith('blob:')
  ) {
    return null;
  }
  let decoded = filePath;
  try {
    decoded = decodeURIComponent(filePath);
  } catch {
    decoded = filePath;
  }
  let resolved;
  if (decoded.startsWith('./')) {
    resolved = entryDir + decoded.slice(2);
  } else if (decoded.startsWith('../')) {
    const pathParts = entryDir.split('/').filter(Boolean);
    let rest = decoded;
    while (rest.startsWith('../')) {
      pathParts.pop();
      rest = rest.slice(3);
    }
    resolved = (pathParts.length ? `${pathParts.join('/')}/` : '') + rest;
  } else if (decoded.startsWith('/')) {
    resolved = decoded.slice(1);
  } else {
    resolved = entryDir + decoded;
  }
  return normalizeZipPath(resolved);
}

function lookupBlobUrlForZipKey(fileMap, zipKey) {
  if (!zipKey) return null;
  if (fileMap[zipKey]) return fileMap[zipKey];
  const lower = zipKey.toLowerCase();
  const found = Object.keys(fileMap).find((k) => k.toLowerCase() === lower);
  return found ? fileMap[found] : null;
}

/**
 * Rewrite media URLs before the document is parsed so external scripts (e.g. iSpring) load
 * from blob URLs — DOMContentLoaded handlers run too late for parser-executed scripts.
 */
function rewriteHtmlSrcHrefsToBlobUrls(html, entryDir, fileMap) {
  return html.replace(/\b(src|href)\s*=\s*(["'])([^"']*)\2/gi, (full, attr, quote, url) => {
    const zipKey = resolveAssetPathToZipKey(entryDir, url);
    if (!zipKey) return full;
    const blobUrl = lookupBlobUrlForZipKey(fileMap, zipKey);
    if (!blobUrl) return full;
    return `${attr}=${quote}${blobUrl}${quote}`;
  });
}

function isFullHtmlScormDocument(html) {
  const head = String(html || '').trimStart().slice(0, 800);
  return /<!DOCTYPE\s+html/i.test(head) || /<html[\s>]/i.test(head);
}

function stripHtmlBaseTags(html) {
  return html.replace(/<base\b[^>]*>/gi, '');
}

/** Injects SCORM bootstrap as the first element inside <head> so publisher scripts run after API + file map exist. */
function injectScormBootstrapAfterHeadOpen(html, scriptBody) {
  const scriptTag = `<script>\n${scriptBody}\n</script>`;
  const headOpen = html.match(/<head([^>\/]*)>/i);
  if (headOpen) {
    const insertAt = headOpen.index + headOpen[0].length;
    return html.slice(0, insertAt) + scriptTag + html.slice(insertAt);
  }
  const htmlOpen = html.match(/<html([^>]*)>/i);
  if (htmlOpen) {
    const insertAt = htmlOpen.index + htmlOpen[0].length;
    return html.slice(0, insertAt) + `<head>${scriptTag}</head>` + html.slice(insertAt);
  }
  return `<!DOCTYPE html><html><head>${scriptTag}</head><body>\n${html}\n</body></html>`;
}

function buildScormBootstrapJavaScript(fileMap, entryDir, scormApiScript) {
  const fileMapJson = JSON.stringify(fileMap);
  const entryDirLit = JSON.stringify(entryDir);
  return `
    window.__scormData = {};
    ${scormApiScript.trim()}
    window.__scormFileMap = ${fileMapJson};
    window.__scormBaseDir = ${entryDirLit};
    window.__scormResolvePath = function(path) {
      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path;
      }
      const baseDir = window.__scormBaseDir;
      let resolved = path.startsWith('/') ? path.substring(1) : baseDir + path;
      resolved = resolved.replace(/\.\//g, '/').replace(/\.\.\//g, '/');
      return window.__scormFileMap[resolved] || path;
    };
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:')) {
        const resolved = window.__scormResolvePath(url);
        if (resolved !== url && typeof resolved === 'string' && resolved.startsWith('blob:')) {
          return originalFetch(resolved, options);
        }
      }
      return originalFetch(url, options);
    };
    document.addEventListener('DOMContentLoaded', function() {
      const fixUrls = function() {
        document.querySelectorAll('img[src], link[href], script[src], source[src]').forEach(el => {
          const attr = el.hasAttribute('src') ? 'src' : 'href';
          const url = el.getAttribute(attr);
          if (url && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
            const resolved = window.__scormResolvePath(url);
            if (resolved !== url) {
              el.setAttribute(attr, resolved);
            }
          }
        });
      };
      fixUrls();
      setTimeout(fixUrls, 100);
      setTimeout(fixUrls, 500);
    });
  `;
}

/**
 * Production-Ready SCORM Player with Supabase Public Storage
 */
const ScormPlayer = ({ 
  scormUrl, 
  lessonId, 
  courseId, 
  onProgress, 
  onComplete,
  onError,
  width = '100%',
  height = '600px',
  autoSave = true,
  autoSaveInterval = 30000
}) => {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const { user } = useAuth();
  const { actions } = useCourseStore();
  const iframeRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const scormApiRef = useRef(null);
  /** Latest values for strict-mode / unmount cleanup (empty-deps effect must not read stale state). */
  const unmountSnapshotRef = useRef({ scormContentUrl: null, scormVersion: null });
  const mountedRef = useRef(true);
  const sessionStartTimeRef = useRef(new Date());
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [scormData, setScormData] = useState({});
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('not_attempted');
  const [scormContentUrl, setScormContentUrl] = useState(null);
  const [loadingStep, setLoadingStep] = useState('');
  const [scormVersion, setScormVersion] = useState(null);
  const [packageMetadata, setPackageMetadata] = useState(null);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  unmountSnapshotRef.current = { scormContentUrl, scormVersion };

  /**
   * Get properly formatted Supabase public URL
   * Handles both full URLs and storage paths
   */
  // const getPublicUrl = useCallback((urlOrPath) => {
  //   if (!urlOrPath) return null;

  //   console.log('Processing URL/path:', urlOrPath);

  //   // If it's already a complete URL, use it
  //   if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
  //     console.log('Already a full URL');
  //     return urlOrPath;
  //   }

  //   // Extract the file path from various formats
  //   let filePath = urlOrPath;

  //   // Remove 'lessons/scorm/' or 'course-content/' prefixes if present
  //   filePath = filePath.replace(/^course-content\//, '');
  //   filePath = filePath.replace(/^lessons\/scorm\//, 'lessons/scorm/');

  //   // Ensure the path starts with 'lessons/scorm/'
  //   if (!filePath.startsWith('lessons/scorm/') && !filePath.startsWith('lessons/')) {
  //     filePath = 'lessons/scorm/' + filePath;
  //   }

  //   console.log('Resolved file path:', filePath);

  //   // Use Supabase's getPublicUrl method
  //   const { data } = supabase.storage
  //     .from('course-content')
  //     .getPublicUrl(filePath);

  //   console.log('Generated public URL:', data.publicUrl);

  //   return data.publicUrl;
  // }, []);
/**
 * Get properly formatted Supabase public URL with exact path matching
 */
/**
 * Get properly formatted Supabase public URL with exact path matching
 */
const getPublicUrl = useCallback((urlOrPath) => {
  if (!urlOrPath) return null;

  // If it's already a complete Supabase URL, extract the exact path
  if (urlOrPath.includes('supabase.co/storage/v1/object/public/')) {
    // Extract the exact path after '/public/'
    const fullPath = urlOrPath.split('/object/public/')[1];
    
    // The path already includes the bucket name, so we need to split it
    const parts = fullPath.split('/');
    const bucketName = parts[0]; // This should be 'course-content'
    const filePath = parts.slice(1).join('/'); // This is the actual file path
    
    // Use the exact path to generate URL
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  // If it's already a complete URL (but not Supabase), use it
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }

  // For storage paths, use them exactly as provided
  const { data } = supabase.storage
    .from('course-content')
    .getPublicUrl(urlOrPath);

  return data.publicUrl;
}, []);
  /**
   * Download SCORM package with proper error handling
   */
  // const downloadScormPackage = useCallback(async (url) => {
  //   try {
  //     console.log('Downloading from URL:', url);

  //     const response = await fetch(url, {
  //       method: 'GET',
  //       headers: {
  //         'Accept': 'application/zip, application/octet-stream, */*',
  //       },
  //       mode: 'cors',
  //       credentials: 'omit'
  //     });

  //     console.log('Download response:', {
  //       ok: response.ok,
  //       status: response.status,
  //       statusText: response.statusText,
  //       contentType: response.headers.get('content-type'),
  //       contentLength: response.headers.get('content-length')
  //     });

  //     if (!response.ok) {
  //       throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
  //     }

  //     const blob = await response.blob();
  //     console.log('Downloaded blob size:', blob.size, 'bytes');

  //     if (blob.size === 0) {
  //       throw new Error('Downloaded file is empty (0 bytes)');
  //     }

  //     return blob;
  //   } catch (error) {
  //     console.error('Download error:', error);
  //     throw error;
  //   }
  // }, []);
/**
 * Download SCORM package with enhanced error handling
 */
const downloadScormPackage = useCallback(async (url) => {
  try {
    // First, try a simple fetch with minimal headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      },
      // Important: Supabase may require specific CORS handling
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      // Get detailed error message
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        errorBody = 'Could not read error response';
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}. Details: ${errorBody}`);
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error('Downloaded file is empty (0 bytes)');
    }

    // Verify it's a ZIP file (Supabase might return JSON errors as successful responses)
    if (blob.type && !blob.type.includes('application/zip') && !blob.type.includes('application/octet-stream')) {
      // Try to read as text to see if it's an error message
      const text = await blob.text();
      if (text.includes('error') || text.includes('message')) {
        throw new Error(`Server returned error: ${text.substring(0, 200)}`);
      }
    }

    return blob;
  } catch (error) {
    throw error;
  }
}, []);
  /**
   * Calculate session time in ISO 8601 duration format
   */
  const calculateSessionTime = useCallback(() => {
    const duration = Math.floor((new Date() - sessionStartTimeRef.current) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    return `PT${hours}H${minutes}M${seconds}S`;
  }, []);

  /**
   * Update lesson progress with retry logic
   */
  const updateLessonProgress = useCallback(async (metadata = {}, retryCount = 0) => {
    if (!mountedRef.current || !user?.id || !lessonId || !courseId) return false;

    try {
      setIsSaving(true);
      
      const currentData = {
        ...scormData,
        ...metadata,
        session_time: calculateSessionTime(),
        last_updated: new Date().toISOString()
      };

      await actions.updateLessonProgress(
        user.id,
        lessonId,
        courseId,
        status === 'completed' || status === 'passed',
        currentData
      );

      if (mountedRef.current) {
        setLastSaveTime(new Date());
        setIsSaving(false);
      }
      
      return true;
    } catch (error) {
      // Error updating lesson progress
      
      if (retryCount < 3 && mountedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return updateLessonProgress(metadata, retryCount + 1);
      }
      
      if (mountedRef.current) {
        setIsSaving(false);
      }
      return false;
    }
  }, [user?.id, lessonId, courseId, status, scormData, actions, calculateSessionTime]);

  /**
   * Handle lesson completion
   */
  const handleCompletion = useCallback(async () => {
    if (!mountedRef.current || !user?.id || !lessonId || !courseId) return;

    try {
      await actions.updateLessonProgress(
        user.id,
        lessonId,
        courseId,
        true,
        {
          ...scormData,
          completed_at: new Date().toISOString(),
          final_score: progress,
          final_status: status,
          total_time: calculateSessionTime()
        }
      );

      await actions.calculateCourseProgress(user.id, courseId);

      if (onComplete) {
        onComplete({
          lessonId,
          courseId,
          score: progress,
          status,
          scormData,
          completionTime: new Date()
        });
      }
    } catch (error) {
      // Error completing lesson
      if (onError) onError(error);
    }
  }, [user?.id, lessonId, courseId, progress, status, scormData, actions, onComplete, onError, calculateSessionTime]);

  /**
   * Create SCORM API wrapper
   */
  const createScormAPI = useCallback(() => {
    if (!user?.id) return null;

    const scorm12API = {
      LMSInitialize: () => {
        if (mountedRef.current) setStatus('incomplete');
        return 'true';
      },
      LMSFinish: () => {
        updateLessonProgress({ finished: true });
        return 'true';
      },
      LMSGetValue: (element) => String(scormData[element] || ''),
      LMSSetValue: (element, value) => {
        if (!mountedRef.current) return 'true';
        setScormData(prev => ({ ...prev, [element]: value }));
        if (element === 'cmi.core.lesson_status') {
          setStatus(value);
          if (value === 'completed' || value === 'passed') handleCompletion();
        }
        if (element === 'cmi.core.score.raw') {
          const score = Math.min(100, Math.max(0, parseFloat(value) || 0));
          setProgress(score);
          if (onProgress) onProgress(score);
        }
        return 'true';
      },
      LMSCommit: () => {
        updateLessonProgress();
        return 'true';
      },
      LMSGetLastError: () => '0',
      LMSGetErrorString: () => 'No error',
      LMSGetDiagnostic: () => 'No diagnostic'
    };

    const scorm2004API = {
      Initialize: () => {
        if (mountedRef.current) setStatus('incomplete');
        return 'true';
      },
      Terminate: () => {
        updateLessonProgress({ terminated: true });
        return 'true';
      },
      GetValue: (element) => String(scormData[element] || ''),
      SetValue: (element, value) => {
        if (!mountedRef.current) return 'true';
        setScormData(prev => ({ ...prev, [element]: value }));
        if (element === 'cmi.completion_status') {
          setStatus(value);
          if (value === 'completed') handleCompletion();
        }
        if (element === 'cmi.success_status' && value === 'passed') {
          setStatus('passed');
          handleCompletion();
        }
        if (element === 'cmi.progress_measure') {
          const progressValue = Math.round((parseFloat(value) || 0) * 100);
          setProgress(progressValue);
          if (onProgress) onProgress(progressValue);
        }
        if (element === 'cmi.score.raw' || element === 'cmi.score.scaled') {
          const score = parseFloat(value) || 0;
          const percentage = element === 'cmi.score.scaled' ? Math.round(score * 100) : score;
          setProgress(Math.min(100, Math.max(0, percentage)));
          if (onProgress) onProgress(percentage);
        }
        return 'true';
      },
      Commit: () => {
        updateLessonProgress();
        return 'true';
      },
      GetLastError: () => '0',
      GetErrorString: () => 'No error',
      GetDiagnostic: () => 'No diagnostic'
    };

    return { scorm12API, scorm2004API };
  }, [scormData, user?.id, onProgress, handleCompletion, updateLessonProgress]);

  useEffect(() => {
    scormApiRef.current = createScormAPI();
  }, [createScormAPI]);

  /**
   * Extract and display SCORM package
   */
//   const extractAndDisplayScorm = useCallback(async (publicUrl) => {
//     if (!mountedRef.current) return;

//     try {
//       setLoadingStep('Downloading SCORM package...');
      
//       const zipBlob = await downloadScormPackage(publicUrl);
      
//       if (!mountedRef.current) return;
      
//       console.log(`Package downloaded: ${(zipBlob.size / 1024).toFixed(2)} KB`);
      
//       setLoadingStep('Parsing SCORM manifest...');
      
//       const parser = new SCORMPackageParser(zipBlob);
//       const parseResult = await parser.parse();
      
//       if (!parseResult.isValid) {
//         throw new Error(`Invalid SCORM package: ${parseResult.error || 'Unknown error'}`);
//       }
      
//       console.log('SCORM parsed:', parseResult);
      
//       if (!mountedRef.current) return;
      
//       setScormVersion(parseResult.version);
//       setPackageMetadata(parseResult.packageData);
      
//       const entryPoint = parseResult.packageData?.launchUrl;
//       if (!entryPoint) {
//         throw new Error('No launch URL found in manifest');
//       }
      
//       setLoadingStep('Extracting content...');
      
//       const JSZip = (await import('jszip')).default;
//       const zip = new JSZip();
//       const zipContent = await zip.loadAsync(zipBlob);
      
//       const entryFile = zipContent.files[entryPoint];
//       if (!entryFile) {
//         throw new Error(`Entry file not found: ${entryPoint}`);
//       }
      
//       const content = await entryFile.async('text');
      
//       if (!mountedRef.current) return;
      
//       const isPlaceholder = content.length < 100 || 
//                            content.includes('Not implemented') || 
//                            content.includes('placeholder');
      
//       const htmlContent = `<!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>${parseResult.packageData?.title || 'SCORM Content'}</title>
//   <style>
//     * { box-sizing: border-box; margin: 0; padding: 0; }
//     body { 
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//       background: #fff;
//     }
//     .scorm-header {
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       color: white;
//       padding: 20px 24px;
//       box-shadow: 0 2px 8px rgba(0,0,0,0.1);
//     }
//     .scorm-header h1 { font-size: 1.5rem; margin-bottom: 4px; }
//     .scorm-header p { opacity: 0.9; font-size: 0.9rem; }
//     .content { padding: 24px; min-height: 400px; }
//     ${isPlaceholder ? `
//     .placeholder {
//       background: #fff3cd;
//       border-left: 4px solid #ffc107;
//       padding: 16px 24px;
//       margin: 16px;
//       border-radius: 4px;
//       color: #856404;
//     }
//     ` : ''}
//   </style>
// </head>
// <body>
//   <div class="scorm-header">
//     <h1>${parseResult.packageData?.title || 'SCORM Package'}</h1>
//     <p>${parseResult.packageData?.description || 'Interactive learning content'}</p>
//   </div>
//   ${isPlaceholder ? '<div class="placeholder">⚠️ This package contains placeholder content.</div>' : ''}
//   <div class="content">${content}</div>
// </body>
// </html>`;
      
//       const blob = new Blob([htmlContent], { type: 'text/html' });
//       const contentUrl = URL.createObjectURL(blob);
      
//       if (mountedRef.current) {
//         setScormContentUrl(contentUrl);
//         setIsLoading(false);
//         setLoadingStep('');
//       } else {
//         URL.revokeObjectURL(contentUrl);
//       }
      
//     } catch (error) {
//       if (!mountedRef.current) return;
      
//       console.error('Extraction error:', error);
      
//       let errorMessage = 'Failed to load SCORM package: ';
//       if (error.message.includes('HTTP 400')) {
//         errorMessage += 'File path is invalid. Check the URL in your database.';
//       } else if (error.message.includes('HTTP 404')) {
//         errorMessage += 'File not found. The package may have been deleted.';
//       } else if (error.message.includes('HTTP 403')) {
//         errorMessage += 'Access denied. Check storage bucket permissions.';
//       } else if (error.message.includes('empty')) {
//         errorMessage += 'Downloaded file is empty or corrupted.';
//       } else {
//         errorMessage += error.message;
//       }
      
//       setError(errorMessage);
//       setIsLoading(false);
//       setLoadingStep('');
//       if (onError) onError(error);
//     }
//   }, [downloadScormPackage, onError]);
  /**
   * Process SCORM package
   */
  // const processScormPackage = useCallback(async () => {
  //   if (!scormUrl || !mountedRef.current) return;

  //   try {
  //     setIsLoading(true);
  //     setError(null);
  //     setLoadingStep('Preparing download...');

  //     console.log('=== SCORM Processing Started ===');
  //     console.log('Input URL:', scormUrl);

  //     // Get the properly formatted public URL
  //     const publicUrl = getPublicUrl(scormUrl);
  //     console.log('Public URL:', publicUrl);

  //     if (!publicUrl) {
  //       throw new Error('Could not generate valid URL from path');
  //     }

  //     await extractAndDisplayScorm(publicUrl);
      
  //   } catch (error) {
  //     if (!mountedRef.current) return;
      
  //     console.error('Processing error:', error);
  //     setError(error.message);
  //     setIsLoading(false);
  //     setLoadingStep('');
  //     if (onError) onError(error);
  //   }
  // }, [scormUrl, getPublicUrl, extractAndDisplayScorm, onError]);
/**
 * Process SCORM package with exact path matching
 */
/**
 * Process SCORM package with exact path matching
 */
const processScormPackage = useCallback(async () => {
  if (!scormUrl || !mountedRef.current) return;

  let zipBlobSize = 0;
  let currentStep = 'Starting...';
  let timeoutFired = false;

  // Create a more robust timeout that can't be easily cleared
  const timeoutId = setTimeout(() => {
    timeoutFired = true;
    if (mountedRef.current) {
      const errorMsg = `SCORM package loading timed out after 5 minutes. Current step: ${currentStep}. ${zipBlobSize > 0 ? `Package size: ${(zipBlobSize / 1024 / 1024).toFixed(2)} MB. ` : ''}The package may be too large, corrupted, or the processing is stuck. Please try again with a smaller package or contact support.`;
      setError(errorMsg);
      setIsLoading(false);
      setLoadingStep('');
      onErrorRef.current?.(new Error('Loading timeout'));
    }
  }, 300000); // 5 minute timeout
  
  // Store timeout ID for cleanup only on success
  const timeoutIdRef = { id: timeoutId };

  const processStartTime = Date.now();

  try {
    setIsLoading(true);
    setError(null);
    setLoadingStartTime(processStartTime);
    setElapsedTime(0);
    setLoadingStep('Preparing download...');

    // Get the properly formatted public URL
    const publicUrl = getPublicUrl(scormUrl);

    if (!publicUrl) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      throw new Error('Could not generate valid URL from path');
    }

    // Extract the storage path (path within the bucket, without bucket name)
    let storagePath = scormUrl;

    if (scormUrl.includes('/storage/v1/object/')) {
      // Handles both /object/public/course-content/... and /object/course-content/...
      const afterObject = scormUrl.split('/object/')[1];
      // Strip optional "public/" prefix, then strip bucket name
      const withoutPublic = afterObject.replace(/^public\//, '');
      const segments = withoutPublic.split('/');
      if (segments[0] === 'course-content') {
        storagePath = segments.slice(1).join('/');
      } else {
        storagePath = withoutPublic;
      }
    }

    // Decode any URL-encoded characters so the path matches the actual filename in storage
    storagePath = decodeURIComponent(storagePath);

    const pathSegments = storagePath.split('/');
    const directory = pathSegments.slice(0, -1).join('/');
    const expectedFileName = pathSegments[pathSegments.length - 1];

    // Step 1: Verify the file actually exists by listing the directory
    setLoadingStep('Verifying file in storage...');
    currentStep = 'Verifying file existence';

    let fileExists = false;
    let directoryFiles = [];
    let listingWorked = false;
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('course-content')
        .list(directory, { limit: 100 });

      if (!listError && files && files.length > 0) {
        listingWorked = true;
        directoryFiles = files.filter((f) => !f.id || f.name).map((f) => f.name);
        fileExists = directoryFiles.some((name) => name === expectedFileName);
      }
    } catch {
      // Listing often fails under RLS or for paths the API treats as opaque — still try download.
    }

    if (listingWorked && !fileExists && directoryFiles.length > 0) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      throw new Error(
        `File "${expectedFileName}" was NOT found in storage directory "${directory}". ` +
          `Files that DO exist in that directory: [${directoryFiles.join(', ')}]. ` +
          `The stored content_url in the database does not match any file in storage. ` +
          `Re-uploading the SCORM package from the lesson editor should fix this.`
      );
    }

    // Step 2: Download (do not require list() — policies may allow read but not list)
    setLoadingStep('Downloading SCORM package...');
    currentStep = 'Downloading';

    let zipBlob;
    try {
      const { data, error } = await Promise.race([
        supabase.storage.from('course-content').download(storagePath),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Download timeout after 60 seconds')), 60000)
        ),
      ]);

      if (error) {
        throw new Error(error.message || error.toString());
      }
      if (!data) {
        throw new Error('No data received from Supabase storage');
      }

      zipBlob = data;
    } catch (sdkError) {
      // Fallback: fetch via public URL
      currentStep = 'Trying public URL download...';
      setLoadingStep('Trying public URL download...');

      try {
        zipBlob = await Promise.race([
          downloadScormPackage(publicUrl),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Public URL download timeout after 60 seconds')), 60000)
          ),
        ]);
      } catch (fetchError) {
        throw new Error(
          `Both download methods failed.\n` +
          `SDK error: ${sdkError.message}\n` +
          `Public URL error: ${fetchError.message}\n` +
          `Attempted path: ${storagePath}`
        );
      }
    }

    zipBlobSize = zipBlob.size;
    currentStep = 'Download complete';
    setLoadingStep(`Downloaded ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);

    if (!mountedRef.current || timeoutFired) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      return;
    }

    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!mountedRef.current || timeoutFired) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      return;
    }

    // Update loading step before parsing
    currentStep = 'Parsing SCORM manifest...';
    setLoadingStep('Parsing SCORM manifest...');
    
    // Force a UI update and check timeout
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (!mountedRef.current || timeoutFired) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      return;
    }
    
    if (Date.now() - processStartTime > 300000) {
      throw new Error('Processing is taking too long. The SCORM package may be too large or complex.');
    }
    
    let parseResult;
    try {
      // Add timeout for parsing to prevent indefinite hanging
      const parseStartTime = Date.now();
      const parsePromise = (async () => {
        const parser = new SCORMPackageParser(zipBlob);
        return await parser.parse();
      })();
      
      const parseTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Parsing timeout after 60 seconds. The SCORM package may be corrupted or too complex.')), 60000)
      );
      
      parseResult = await Promise.race([parsePromise, parseTimeoutPromise]);
      
      // Check if timeout fired during parsing
      if (timeoutFired || !mountedRef.current) {
        if (!timeoutFired) clearTimeout(timeoutIdRef.id);
        return;
      }
      
      // Update step after successful parsing
      currentStep = 'Manifest parsed successfully';
      setLoadingStep(`Manifest parsed (took ${Math.round((Date.now() - parseStartTime) / 1000)}s), extracting content...`);
    } catch (parseError) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      throw new Error(`Failed to parse SCORM manifest: ${parseError.message || 'Unknown parsing error'}`);
    }
    
    if (!parseResult || !parseResult.isValid) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      throw new Error(`Invalid SCORM package: ${parseResult?.error || 'Unknown error'}`);
    }
    
    if (!mountedRef.current || timeoutFired) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      return;
    }
    
    setScormVersion(parseResult.version);
    setPackageMetadata(parseResult.packageData);
    
    const entryPoint = parseResult.packageData?.launchUrl;
    if (!entryPoint) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      throw new Error('No launch URL found in manifest');
    }
    
    // Check timeout before continuing
    if (timeoutFired || !mountedRef.current) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      return;
    }
    
    currentStep = 'Extracting content...';
    setLoadingStep('Extracting content from ZIP...');
    
    // Force UI update
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (!mountedRef.current || timeoutFired) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      return;
    }
    
    if (Date.now() - processStartTime > 300000) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      throw new Error('Processing is taking too long. The SCORM package may be too large or complex.');
    }
    
    // Add timeout for ZIP loading
    const zipLoadStartTime = Date.now();
    const zipLoadPromise = (async () => {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      return await zip.loadAsync(zipBlob);
    })();
    
    const zipLoadTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('ZIP extraction timeout after 60 seconds')), 60000)
    );
    
    let zipContent;
    try {
      zipContent = await Promise.race([zipLoadPromise, zipLoadTimeoutPromise]);
      
      if (timeoutFired || !mountedRef.current) {
        if (!timeoutFired) clearTimeout(timeoutIdRef.id);
        return;
      }
      
      setLoadingStep(`ZIP loaded (took ${Math.round((Date.now() - zipLoadStartTime) / 1000)}s), processing files...`);
    } catch (zipError) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      throw new Error(`Failed to extract ZIP: ${zipError.message || 'Unknown error'}`);
    }
    
    const { entry: entryZipObj, key: entryZipKey } = getZipEntry(zipContent, entryPoint);
    if (!entryZipObj) {
      throw new Error(`Entry file not found: ${entryPoint}`);
    }

    const entryDir = entryZipKey.includes('/')
      ? entryZipKey.slice(0, entryZipKey.lastIndexOf('/') + 1)
      : '';

    let entryContent;
    try {
      entryContent = await entryZipObj.async('text');
    } catch {
      throw new Error(`Could not read SCORM entry file: ${entryZipKey}`);
    }

    if (!mountedRef.current || timeoutFired) {
      if (!timeoutFired) clearTimeout(timeoutIdRef.id);
      return;
    }

    const packed = await extractAllZipFilesToMap(zipContent, zipBlobSize, {
      mountedRef,
      setLoadingStep,
    });

    const fileMap = { ...packed.fileMap };
    const blobUrlsToCleanup = [...packed.blobUrlsToCleanup];

    if (packed.mode === 'selective') {
      const referencedFiles = new Set();
      const assetPatterns = [
        /href=["']([^"']+\.(css|ico))["']/gi,
        /src=["']([^"']+\.(js|jpg|jpeg|png|gif|svg|webp|mp4|mp3|wav|ogg))["']/gi,
        /url\(["']?([^"')]{0,600}?)["']?\)/gi,
        /background=["']([^"']{0,600})["']/gi,
      ];

      assetPatterns.forEach((pattern) => {
        let iter = 0;
        let match;
        while ((match = pattern.exec(entryContent)) !== null && iter < MAX_ASSET_REGEX_ITERATIONS) {
          iter += 1;
          const filePath = match[1] || match[0];
          if (filePath && !filePath.startsWith('http') && !filePath.startsWith('data:')) {
            let resolved = filePath;
            if (filePath.startsWith('./')) {
              resolved = entryDir + filePath.slice(2);
            } else if (filePath.startsWith('../')) {
              const pathParts = entryDir.split('/').filter(Boolean);
              pathParts.pop();
              resolved = `${pathParts.join('/')}/${filePath.slice(3)}`;
            } else if (!filePath.startsWith('/')) {
              resolved = entryDir + filePath;
            } else {
              resolved = filePath.slice(1);
            }
            referencedFiles.add(normalizeZipPath(resolved));
          }
        }
        pattern.lastIndex = 0;
      });

      const entryDirNorm = normalizeZipPath(entryDir);
      Object.keys(zipContent.files).forEach((path) => {
        const norm = normalizeZipPath(path);
        if (!zipContent.files[path].dir && entryDirNorm && norm.startsWith(entryDirNorm)) {
          const relativePath = norm.slice(entryDirNorm.length);
          if (relativePath && !relativePath.includes('/')) {
            referencedFiles.add(norm);
          }
        }
      });

      currentStep = `Extracting ${referencedFiles.size} files...`;
      setLoadingStep(`Extracting ${referencedFiles.size} files...`);

      const extractionPromises = [];
      for (const rel of referencedFiles) {
        const { entry: zf, key: canonical } = getZipEntry(zipContent, rel);
        if (!zf || zf.dir) continue;
        const canonicalKey = normalizeZipPath(canonical);
        extractionPromises.push(
          (async () => {
            try {
              let blob;
              const fileExtension = canonicalKey.split('.').pop()?.toLowerCase() || '';
              if (
                ['css', 'js', 'html', 'htm', 'xml', 'json', 'txt', 'xhtml'].includes(fileExtension)
              ) {
                const text = await zf.async('text');
                const mimeType =
                  fileExtension === 'css'
                    ? 'text/css'
                    : fileExtension === 'js'
                      ? 'application/javascript'
                      : fileExtension === 'html' || fileExtension === 'htm' || fileExtension === 'xhtml'
                        ? 'text/html'
                        : fileExtension === 'xml'
                          ? 'application/xml'
                          : fileExtension === 'json'
                            ? 'application/json'
                            : 'text/plain';
                blob = new Blob([text], { type: mimeType });
              } else {
                blob = await zf.async('blob');
              }
              const blobUrl = URL.createObjectURL(blob);
              return { path: canonicalKey, url: blobUrl };
            } catch {
              return null;
            }
          })()
        );
      }

      const results = await Promise.all(extractionPromises);
      if (!mountedRef.current || timeoutFired) {
        if (!timeoutFired) clearTimeout(timeoutIdRef.id);
        return;
      }
      results.forEach((result) => {
        if (result) {
          fileMap[result.path] = result.url;
          blobUrlsToCleanup.push(result.url);
        }
      });
    }

    const entryNorm = normalizeZipPath(entryZipKey);
    if (packed.mode !== 'full' || !fileMap[entryNorm]) {
      const entryBlob = new Blob([entryContent], { type: 'text/html' });
      const entryBlobUrl = URL.createObjectURL(entryBlob);
      fileMap[entryNorm] = entryBlobUrl;
      blobUrlsToCleanup.push(entryBlobUrl);
    }

    const entryWithBlobUrls = rewriteHtmlSrcHrefsToBlobUrls(entryContent, entryDir, fileMap);

    // Determine SCORM version
    const scormVersionToUse = parseResult.version || '1.2';
    
    const scormApiScript = scormVersionToUse === '2004' ? `
    // SCORM 2004 API
    window.API_1484_11 = {
      Initialize: function(param) {
        return 'true';
      },
      Terminate: function(param) {
        return 'true';
      },
      GetValue: function(element) {
        return window.__scormData && window.__scormData[element] ? String(window.__scormData[element]) : '';
      },
      SetValue: function(element, value) {
        if (!window.__scormData) window.__scormData = {};
        window.__scormData[element] = value;
        // Notify parent via postMessage
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({
              type: 'scorm_setvalue',
              element: element,
              value: value
            }, '*');
          } catch(e) {}
        }
        return 'true';
      },
      Commit: function(param) {
        // Notify parent via postMessage
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({
              type: 'scorm_commit'
            }, '*');
          } catch(e) {}
        }
        return 'true';
      },
      GetLastError: function() {
        return '0';
      },
      GetErrorString: function(errorCode) {
        return 'No error';
      },
      GetDiagnostic: function(errorCode) {
        return 'No diagnostic';
      }
    };
    ` : `
    // SCORM 1.2 API
    window.API = {
      LMSInitialize: function(param) {
        // Notify parent via postMessage
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({
              type: 'scorm_initialize'
            }, '*');
          } catch(e) {}
        }
        return 'true';
      },
      LMSFinish: function(param) {
        // Notify parent via postMessage
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({
              type: 'scorm_finish'
            }, '*');
          } catch(e) {}
        }
        return 'true';
      },
      LMSGetValue: function(element) {
        return window.__scormData && window.__scormData[element] ? String(window.__scormData[element]) : '';
      },
      LMSSetValue: function(element, value) {
        if (!window.__scormData) window.__scormData = {};
        window.__scormData[element] = value;
        // Notify parent via postMessage
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({
              type: 'scorm_setvalue',
              element: element,
              value: value
            }, '*');
          } catch(e) {}
        }
        return 'true';
      },
      LMSCommit: function(param) {
        // Notify parent via postMessage
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({
              type: 'scorm_commit'
            }, '*');
          } catch(e) {}
        }
        return 'true';
      },
      LMSGetLastError: function() {
        return '0';
      },
      LMSGetErrorString: function(errorCode) {
        return 'No error';
      },
      LMSGetDiagnostic: function(errorCode) {
        return 'No diagnostic';
      }
    };
    `;

    const bootstrapJs = buildScormBootstrapJavaScript(fileMap, entryDir, scormApiScript);

    let htmlContent;
    if (isFullHtmlScormDocument(entryWithBlobUrls)) {
      htmlContent = injectScormBootstrapAfterHeadOpen(
        stripHtmlBaseTags(entryWithBlobUrls),
        bootstrapJs
      );
    } else {
      htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${parseResult.packageData?.title || 'SCORM Content'}</title>
  <script>
${bootstrapJs}
  </script>
</head>
<body>
  ${entryWithBlobUrls}
</body>
</html>`;
    }
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const contentUrl = URL.createObjectURL(blob);
    
    // Store blob URLs for cleanup
    if (!timeoutFired) clearTimeout(timeoutIdRef.id);
    
    if (mountedRef.current && !timeoutFired) {
      setScormContentUrl(contentUrl);
    setIsLoading(false);
    setLoadingStep('');
    
      // Store blob URLs for cleanup on unmount
      if (!window.__scormBlobUrls) {
        window.__scormBlobUrls = [];
      }
      window.__scormBlobUrls.push(...blobUrlsToCleanup);
    } else {
      URL.revokeObjectURL(contentUrl);
      blobUrlsToCleanup.forEach(url => URL.revokeObjectURL(url));
    }
    
  } catch (error) {
    if (!timeoutFired) clearTimeout(timeoutIdRef.id);
    if (!mountedRef.current || timeoutFired) return;
    
    let errorMessage = error.message || error.toString() || 'Failed to load SCORM package: Unknown error occurred.';
    
    // If the error message already contains detailed information, use it as-is
    // Otherwise, add context
    if (!errorMessage.includes('SCORM package') && !errorMessage.includes('Failed to download')) {
      errorMessage = `Failed to load SCORM package: ${errorMessage}`;
    }
    
    setError(errorMessage);
    setIsLoading(false);
    setLoadingStep('');
    onErrorRef.current?.(error);
  }
}, [scormUrl, getPublicUrl, downloadScormPackage]);

  const processScormPackageRef = useRef(processScormPackage);
  processScormPackageRef.current = processScormPackage;

  /**
   * Initialize — depend only on scormUrl so unstable parent callbacks (e.g. inline onError)
   * do not restart the full download every render.
   */
  useEffect(() => {
    mountedRef.current = true;
    if (!scormUrl) {
      setIsLoading(false);
      return undefined;
    }
    processScormPackageRef.current();
    return () => {
      mountedRef.current = false;
    };
  }, [scormUrl]);

  /**
   * Auto-save
   */
  useEffect(() => {
    if (!autoSave || !mountedRef.current) return;

    autoSaveTimerRef.current = setInterval(() => {
      if (mountedRef.current && status !== 'not_attempted' && !isSaving) {
        updateLessonProgress({ auto_saved: true });
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [autoSave, autoSaveInterval, status, isSaving]);

  /**
   * Handle SCORM API messages from iframe
   */
  useEffect(() => {
    if (!scormContentUrl || !mountedRef.current) return;

    const handleMessage = (event) => {
      // Only accept messages from our iframe (blob URLs are same-origin)
      if (!mountedRef.current) return;

      try {
        const apis = createScormAPI();
        if (!apis) return;

        const { type, element, value } = event.data || {};

        switch (type) {
          case 'scorm_initialize':
            if (scormVersion === '2004') {
              apis.scorm2004API.Initialize('');
            } else {
              apis.scorm12API.LMSInitialize('');
            }
            break;
          case 'scorm_setvalue':
            if (scormVersion === '2004') {
              apis.scorm2004API.SetValue(element, value);
            } else {
              apis.scorm12API.LMSSetValue(element, value);
            }
            break;
          case 'scorm_commit':
            if (scormVersion === '2004') {
              apis.scorm2004API.Commit('');
            } else {
              apis.scorm12API.LMSCommit('');
            }
            break;
          case 'scorm_finish':
            if (scormVersion === '2004') {
              apis.scorm2004API.Terminate('');
            } else {
              apis.scorm12API.LMSFinish('');
            }
            break;
        }
      } catch (error) {
        // Ignore message handling errors
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [scormContentUrl, scormVersion, createScormAPI]);

  /**
   * Revoke prior iframe blob URLs when the active URL changes (do not toggle mountedRef here —
   * that ran on every content swap and aborted in-flight loading).
   */
  const prevContentUrlRef = useRef(null);
  useEffect(() => {
    const prev = prevContentUrlRef.current;
    prevContentUrlRef.current = scormContentUrl;
    if (prev && prev.startsWith('blob:') && prev !== scormContentUrl) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        /* ignore */
      }
    }
  }, [scormContentUrl]);

  /**
   * Full unmount cleanup
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);

      const { scormContentUrl: contentUrlForCleanup, scormVersion: versionForCleanup } =
        unmountSnapshotRef.current;

      try {
        const apis = scormApiRef.current;
        if (apis) {
          if (versionForCleanup === '2004') {
            apis.scorm2004API.Terminate('');
          } else {
            apis.scorm12API.LMSFinish('');
          }
        }
      } catch {
        /* ignore */
      }

      if (contentUrlForCleanup?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(contentUrlForCleanup);
        } catch {
          /* ignore */
        }
      }

      if (window.__scormBlobUrls) {
        window.__scormBlobUrls.forEach((url) => {
          try {
            URL.revokeObjectURL(url);
          } catch {
            /* ignore */
          }
        });
        window.__scormBlobUrls = [];
      }
    };
  }, []);

  const handleManualSave = useCallback(async () => {
    await updateLessonProgress({ manual_save: true });
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setLoadingStartTime(Date.now());
    processScormPackage();
  }, [processScormPackage]);

  const statusDisplay = useMemo(() => {
    const map = {
      'not_attempted': { text: 'Not Started', color: 'text-gray-600', icon: Clock },
      'incomplete': { text: 'In Progress', color: 'text-blue-600', icon: Clock },
      'completed': { text: 'Completed', color: 'text-green-600', icon: CheckCircle },
      'passed': { text: 'Passed', color: 'text-green-600', icon: CheckCircle },
      'failed': { text: 'Failed', color: 'text-red-600', icon: AlertTriangle }
    };
    return map[status] || map['not_attempted'];
  }, [status]);

  // Track elapsed time while loading — must be before any early returns
  useEffect(() => {
    if (!isLoading || !loadingStartTime) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - loadingStartTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isLoading, loadingStartTime]);

  if (error) {
    const extractedPath = (() => {
      if (!scormUrl) return 'No URL provided';
      if (scormUrl.includes('/object/public/')) {
        const parts = scormUrl.split('/object/public/')[1]?.split('/');
        return parts?.slice(1).join('/') || scormUrl;
      }
      return scormUrl;
    })();

    return (
      <div className="flex items-center justify-center min-h-[400px] bg-red-50 border border-red-200 rounded-lg p-8">
        <div className="text-center max-w-2xl">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-800 mb-3">SCORM Loading Error</h3>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          
          <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6 text-left">
            <div className="mb-3 p-2 bg-red-200/60 rounded text-xs break-all">
              <strong>Attempted path:</strong>{' '}
              <code className="bg-red-200 px-1 rounded">{extractedPath}</code>
            </div>
            <p className="text-xs font-semibold text-red-800 mb-2">Troubleshooting Steps:</p>
            <ol className="text-xs text-red-700 space-y-1.5 list-decimal list-inside">
              <li>Open Supabase Dashboard &rarr; Storage &rarr; <code className="bg-red-200 px-1 rounded">course-content</code> bucket</li>
              <li>Navigate to <code className="bg-red-200 px-1 rounded">lessons/scorm/</code> and verify the file exists at the exact path shown above</li>
              <li>Confirm the bucket is set to <strong>Public</strong> (Settings &rarr; Policies)</li>
              <li>If the filename has a timestamp suffix (e.g. <code className="bg-red-200 px-1 rounded">_1741300000000</code>), ensure the database <code className="bg-red-200 px-1 rounded">content_url</code> matches the actual filename</li>
              <li>Try re-uploading the SCORM package from the lesson editor</li>
            </ol>
            <div className="mt-3 p-2 bg-red-200 rounded text-xs">
              <strong>Expected path format:</strong><br/>
              <code>lessons/scorm/[courseId]/filename_[timestamp].zip</code>
            </div>
          </div>
          
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 border border-gray-200 rounded-lg p-8">
        <div className="text-center max-w-md">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-700 mb-2">Loading SCORM content...</p>
          {loadingStep && (
            <p className="text-sm text-gray-600 mb-2">{loadingStep}</p>
          )}
          <p className="text-xs text-gray-500 mt-4">
            Elapsed time: {timeDisplay}
            {elapsedTime > 60 && (
              <span className="block mt-1 text-orange-600">
                This is taking longer than usual. Large packages may take 2-3 minutes.
              </span>
            )}
          </p>
          {elapsedTime > 120 && (
            <button
              onClick={() => {
                setError('Loading cancelled by user');
                setIsLoading(false);
                setLoadingStep('');
                onErrorRef.current?.(new Error('Loading cancelled'));
              }}
              className="mt-4 px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Loading
            </button>
          )}
        </div>
      </div>
    );
  }

  const StatusIcon = statusDisplay.icon;

  return (
    <div className="scorm-player-container space-y-4">
      {scormContentUrl && (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <iframe
            ref={iframeRef}
            src={scormContentUrl}
            width={width}
            height={height}
            className="w-full"
            title="SCORM Content"
            allow="fullscreen"
            sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-same-origin"
            style={{ minHeight: '500px' }}
          />
        </div>
      )}
      
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${statusDisplay.color}`} />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
              <p className={`font-medium ${statusDisplay.color}`}>{statusDisplay.text}</p>
            </div>
          </div>
          
          {progress > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">{progress}%</span>
            </div>
          )}
          
          {lastSaveTime && (
            <div className="text-xs text-gray-500">
              Saved: {lastSaveTime.toLocaleTimeString()}
            </div>
          )}
        </div>
        
        <button
          onClick={handleManualSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </button>
      </div>
      
      {packageMetadata && (
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Package Info</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {packageMetadata.title && (
              <div>
                <span className="text-gray-500">Title:</span>
                <span className="ml-2 font-medium">{packageMetadata.title}</span>
              </div>
            )}
            {scormVersion && (
              <div>
                <span className="text-gray-500">Version:</span>
                <span className="ml-2 font-medium">{scormVersion}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScormPlayer;