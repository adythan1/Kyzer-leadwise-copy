// src/lib/scormParser.js
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

/** Manifest root can vary slightly depending on XML shape */
function getManifestRoot(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.manifest) return parsed.manifest;
  const key = Object.keys(parsed).find((k) => /manifest$/i.test(k));
  return key ? parsed[key] : null;
}

/** ZIP entry names are case-sensitive; packages often use varying paths */
function findManifestZipEntry(contents) {
  const names = Object.keys(contents.files).filter((n) => !contents.files[n].dir);
  return (
    names.find((n) => /(^|\/)imsmanifest\.xml$/i.test(n)) ||
    names.find((n) => n.toLowerCase().endsWith('imsmanifest.xml')) ||
    null
  );
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Depth-first: first item node with @_identifierref */
function findFirstResourceRef(itemNode) {
  if (!itemNode) return null;
  const items = asArray(itemNode);
  for (const it of items) {
    if (it['@_identifierref']) return it['@_identifierref'];
    if (it.item) {
      const nested = findFirstResourceRef(it.item);
      if (nested) return nested;
    }
  }
  return null;
}

function normalizeResources(resourceField) {
  if (!resourceField) return [];
  return asArray(resourceField);
}

function pickOrganization(organizationsBlock) {
  if (!organizationsBlock) return null;
  const orgs = organizationsBlock.organization;
  const orgList = asArray(orgs);
  if (orgList.length === 0) return null;
  const defaultId = organizationsBlock['@_default'];
  if (defaultId) {
    const found = orgList.find((o) => o['@_identifier'] === defaultId);
    if (found) return found;
  }
  return orgList[0];
}

export class SCORMPackageParser {
  constructor(file) {
    this.file = file;
    this.manifest = null;
    this.packageData = {};
  }

  async parse() {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(this.file);

      const manifestPath = findManifestZipEntry(contents);
      if (!manifestPath) {
        throw new Error('Invalid SCORM package: imsmanifest.xml not found');
      }

      const manifestFile = contents.files[manifestPath];
      const manifestXml = await manifestFile.async('string');
      const manifest = await this.parseManifest(manifestXml);

      this.manifest = manifest;
      this.packageData = await this.extractPackageData(manifest, contents);

      return {
        isValid: true,
        manifest: this.manifest,
        packageData: this.packageData,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  async parseManifest(xmlString) {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: true,
        parseNodeValue: true,
        parseTrueNumberOnly: false,
        arrayMode: false,
      });

      return parser.parse(xmlString);
    } catch (error) {
      throw new Error(`Failed to parse manifest XML: ${error.message}`);
    }
  }

  async extractPackageData(manifest, zipContents) {
    const root = getManifestRoot(manifest);
    if (!root) {
      throw new Error('Invalid manifest: missing root element');
    }

    const resourcesRaw = root.resources?.resource;
    const resources = normalizeResources(resourcesRaw);

    const packageData = {
      identifier: root['@_identifier'],
      version: this.detectSCORMVersion(manifest),
      title: this.extractTitle(manifest),
      organizations: root.organizations,
      resources,
      launchUrl: null,
    };

    const org = pickOrganization(root.organizations);
    const resourceRef = org ? findFirstResourceRef(org.item) : null;

    if (resourceRef && resources.length > 0) {
      const launchResource = resources.find((r) => r['@_identifier'] === resourceRef);
      if (launchResource && launchResource['@_href']) {
        packageData.launchUrl = launchResource['@_href'];
      }
    }

    if (!packageData.launchUrl && resources.length === 1 && resources[0]['@_href']) {
      packageData.launchUrl = resources[0]['@_href'];
    }

    return packageData;
  }

  detectSCORMVersion(manifest) {
    const root = getManifestRoot(manifest);
    const metadata = root?.metadata;
    if (!metadata) return '1.2';

    const sv = metadata.schemaversion;
    const text =
      typeof sv === 'string'
        ? sv
        : sv?.['#text'] != null
          ? String(sv['#text'])
          : sv != null
            ? String(sv)
            : '';
    if (text.includes('2004')) return '2004';
    return '1.2';
  }

  extractTitle(manifest) {
    const root = getManifestRoot(manifest);
    const metadata = root?.metadata;
    if (metadata?.lom?.general?.title?.langstring != null) {
      const title = metadata.lom.general.title.langstring;
      if (typeof title === 'string') return title;
      return title['#text'] || title || 'Untitled SCORM Package';
    }

    const orgs = root?.organizations;
    const org = pickOrganization(orgs);
    if (org?.title) {
      if (typeof org.title === 'string') return org.title;
      return org.title['#text'] || org.title || 'Untitled SCORM Package';
    }

    return 'Untitled SCORM Package';
  }
}
