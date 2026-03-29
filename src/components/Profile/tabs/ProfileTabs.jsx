// src/components/profile/tabs/ProfileTab.jsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Camera, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useProfile } from "@/hooks/auth/useProfile";
import {
  AVATAR_FILE_INPUT_ACCEPT,
  AVATAR_UNSUPPORTED_TYPE_MESSAGE,
  isAllowedAvatarImageType,
} from "@/utils/avatarUploadLimits";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().optional(),
});
export default function ProfileTab({ user }) {
  const { updateProfile, uploadAvatar, loading } = useProfile();
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "",
    },
  });

  useEffect(() => {
    if (user) {
      // Map to your actual database columns
      setValue("firstName", user.user_metadata?.first_name || "");
      setValue("lastName", user.user_metadata?.last_name || "");
      setValue("email", user.email || "");
      setValue("role", user.user_metadata?.role || "");
      setProfileImage(user.user_metadata?.avatar_url);
    }
  }, [user, setValue]);

  const onSubmit = async (data) => {
    try {
      await updateProfile(data);
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      event.target.value = "";
      return;
    }

    if (!isAllowedAvatarImageType(file.type)) {
      toast.error(AVATAR_UNSUPPORTED_TYPE_MESSAGE);
      event.target.value = "";
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadAvatar(file);
      setProfileImage(imageUrl);
      toast.success("Profile picture updated!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload image";
      toast.error(message);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center space-x-6 mb-8">
        {/* Profile Image */}
        <div className="relative">
          <div className="w-24 h-24 bg-background-medium rounded-full flex items-center justify-center overflow-hidden">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-text-light" />
            )}
          </div>
          <label
            htmlFor="profile-image"
            className={`absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-dark transition-colors ${
              uploadingImage ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {uploadingImage ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-white" />
            )}
          </label>
          <input
            id="profile-image"
            type="file"
            accept={AVATAR_FILE_INPUT_ACCEPT}
            onChange={handleImageUpload}
            disabled={uploadingImage}
            className="hidden"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-text-dark">
            {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
          </h2>
          <p className="text-text-light">{user?.email}</p>
          <p className="text-sm text-text-muted">
            Member since {new Date(user?.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <section>
          <h3 className="text-lg font-medium text-text-dark mb-4">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                First name *
              </label>
              <input
                {...register("firstName")}
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                  errors.firstName ? "border-red-500" : "border-background-dark"
                }`}
                aria-invalid={errors.firstName ? "true" : "false"}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Last name *
              </label>
              <input
                {...register("lastName")}
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                  errors.lastName ? "border-red-500" : "border-background-dark"
                }`}
                aria-invalid={errors.lastName ? "true" : "false"}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section>
          <h3 className="text-lg font-medium text-text-dark mb-4">
            Contact Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Email address
              </label>
              <input
                {...register("email")}
                type="email"
                disabled
                className="w-full px-3 py-2 border border-background-dark rounded-lg bg-background-medium cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-text-muted">
                Email cannot be changed. Contact support if you need to update
                your email.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Role
              </label>
              <input
                {...register("role")}
                type="text"
                placeholder="Your role or job title"
                className="w-full px-3 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !isDirty}
            className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${
              loading || !isDirty
                ? "bg-background-dark text-text-muted cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary-dark"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
