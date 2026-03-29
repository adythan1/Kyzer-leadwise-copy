// import { useState } from "react";
// import { useAuth } from "./useAuth";
// import { supabase } from "@/lib/supabase";

// export function useProfile() {
//   const { user, refreshUser } = useAuth();
//   const [loading, setLoading] = useState(false);

//   const updateProfile = async (profileData) => {
//     if (!user) {
//       throw new Error("User not authenticated");
//     }

//     setLoading(true);

//     try {
//       // Update user profile in the profiles table
//       const { error: profileError } = await supabase
//         .from("profiles")
//         .update({
//           first_name: profileData.firstName,
//           last_name: profileData.lastName,
//           company_name: profileData.companyName,
//           job_title: profileData.jobTitle,
//           bio: profileData.bio,
//           location: profileData.location,
//           website: profileData.website,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", user.id);

//       if (profileError) {
//         throw profileError;
//       }

//       // Refresh user data to reflect changes
//       await refreshUser();
      
//       return true;
//     } catch (error) {
//       console.error("Error updating profile:", error);
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const uploadAvatar = async (file) => {
//     if (!user) {
//       throw new Error("User not authenticated");
//     }

//     try {
//       // Create a unique file name
//       const fileExt = file.name.split(".").pop();
//       const fileName = `${user.id}-${Date.now()}.${fileExt}`;

//       // Upload file to Supabase Storage
//       const { error: uploadError } = await supabase.storage
//         .from("avatars")
//         .upload(fileName, file, {
//           upsert: true,
//         });

//       if (uploadError) {
//         throw uploadError;
//       }

//       // Get public URL for the uploaded file
//       const { data: { publicUrl } } = supabase.storage
//         .from("avatars")
//         .getPublicUrl(fileName);

//       // Update profile with new avatar URL
//       const { error: updateError } = await supabase
//         .from("profiles")
//         .update({
//           avatar_url: publicUrl,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", user.id);

//       if (updateError) {
//         throw updateError;
//       }

//       // Refresh user data
//       await refreshUser();

//       return publicUrl;
//     } catch (error) {
//       console.error("Error uploading avatar:", error);
//       throw error;
//     }
//   };

//   const deleteAccount = async () => {
//     if (!user) {
//       throw new Error("User not authenticated");
//     }

//     setLoading(true);

//     try {
//       // Mark account for deletion (soft delete)
//       const { error } = await supabase
//         .from("profiles")
//         .update({
//           deleted_at: new Date().toISOString(),
//           status: "deleted",
//         })
//         .eq("id", user.id);

//       if (error) {
//         throw error;
//       }

//       // Sign out the user
//       await supabase.auth.signOut();
      
//       return true;
//     } catch (error) {
//       console.error("Error deleting account:", error);
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {
//     loading,
//     updateProfile,
//     uploadAvatar,
//     deleteAccount,
//   };
// }


// src/hooks/auth/useProfile.js - Fixed avatar upload path
import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase";
import {
  AVATAR_UNSUPPORTED_TYPE_MESSAGE,
  getAvatarStorageFileExtension,
  isAllowedAvatarImageType,
  userMessageForAvatarStorageError,
} from "@/utils/avatarUploadLimits";

export function useProfile() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch profile data
  const fetchProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return await createProfile();
        }
        throw fetchError;
      }
      setProfileData(data);
      return data;

    } catch (err) {
      console.error("❌ Error fetching profile:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create new profile
  const createProfile = async () => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {

      const profileData = {
        id: user.id, // CRITICAL: Your correct approach
        email: user.email,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: user.user_metadata?.role || '',
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        throw error;
      }
      setProfileData(data);
      return data;

    } catch (err) {
      console.error("❌ Error creating profile:", err);
      setError(err.message);
      throw err;
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      setLoading(true);
      setError(null);
      const updateData = {
        first_name: updates.firstName,
        last_name: updates.lastName,
        role: updates.role,
        bio: updates.bio,
        location: updates.location,
        website: updates.website,
        job_title: updates.jobTitle,
        company_name: updates.companyName,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfileData(data);

      // Also update auth metadata (but don't trigger refreshUser to prevent loops)
      try {
        await supabase.auth.updateUser({
          data: {
            first_name: updates.firstName,
            last_name: updates.lastName,
            role: updates.role,
          }
        });
      } catch (authError) {
        console.warn("⚠️ Auth metadata update failed:", authError);
      }

      return data;

    } catch (err) {
      console.error("❌ Error updating profile:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Upload avatar - FIXED: Correct file path
  const uploadAvatar = async (file) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      setLoading(true);
      setError(null);

      // Validate file
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File size must be less than 2MB");
      }

      if (!file.type.startsWith('image/')) {
        throw new Error("File must be an image");
      }

      if (!isAllowedAvatarImageType(file.type)) {
        throw new Error(AVATAR_UNSUPPORTED_TYPE_MESSAGE);
      }

      const fileExt = getAvatarStorageFileExtension(file.type);
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(userMessageForAvatarStorageError(uploadError.message));
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { data, error } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfileData(data);

      // Update auth metadata (but don't call refreshUser to prevent loops)
      try {
        await supabase.auth.updateUser({
          data: { avatar_url: publicUrl }
        });
      } catch {
        // Optional: sync avatar to auth metadata; profile row already saved
      }

      return publicUrl;

    } catch (err) {
      const message =
        err instanceof Error ? err.message : userMessageForAvatarStorageError(String(err));
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch profile when user changes
  useEffect(() => {
    if (user?.id && !profileData) {
      fetchProfile().catch(console.error);
    }
  }, [user?.id]);

  return {
    loading,
    error,
    profileData,
    updateProfile,
    uploadAvatar,
    fetchProfile,
    createProfile,
  };
}