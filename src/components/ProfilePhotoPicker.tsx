import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  RefreshCw,
  Check,
  Sparkles,
  AlertCircle,
  Eye,
} from "lucide-react";
import { storage, isFirebaseReady } from "../lib/firebase";

interface ProfilePhotoPickerProps {
  userId: string;
  currentPhoto: string;
  onPhotoUploaded: (url: string) => void;
  onStatusMessage: (msg: string | null) => void;
  onErrorMessage: (msg: string | null) => void;
}

export default function ProfilePhotoPicker({
  userId,
  currentPhoto,
  onPhotoUploaded,
  onStatusMessage,
  onErrorMessage,
}: ProfilePhotoPickerProps) {
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream upon unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    onErrorMessage(null);
    try {
      setCameraActive(true);
      setPreviewUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraActive(false);
      onErrorMessage(
        "⚠️ تعذر تشغيل الكاميرا؛ يرجى التأكد من إعطاء صلاحية الكاميرا للموقع أو استخدام ميزة رفع الملفات.",
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Center crop
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL("image/png");
        setPreviewUrl(dataUrl);
        stopCamera();
      }
    } catch (err) {
      console.error("Failed to capture snapshot:", err);
      onErrorMessage("فشل في التقاط الصورة من البث المباشر.");
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onErrorMessage("يرجى اختيار ملف صورة صالح فقط (PNG, JPG, JPEG).");
      return;
    }
    // Max 4MB
    if (file.size > 4 * 1024 * 1024) {
      onErrorMessage("حجم الصورة لابد أن يكون أقل من 4 ميجابايت.");
      return;
    }

    setLoading(true);
    onErrorMessage(null);
    onStatusMessage("جاري رفع الصورة الشخصية إلى الخادم بأمان...");

    try {
      if (isFirebaseReady && storage) {
        const { ref, uploadBytes, getDownloadURL } =
          await import("firebase/storage");
        const fileRef = ref(storage, `profiles/${userId}_avatar.png`);

        // Custom check to guarantee successful upload before writing URL
        const uploadResult = await uploadBytes(fileRef, file);
        if (!uploadResult) {
          throw new Error(
            "لم يتم تلقي بيانات تأكيدية للرفع من Firebase Storage.",
          );
        }

        const downloadUrl = await getDownloadURL(fileRef);
        onPhotoUploaded(downloadUrl);
        onStatusMessage("🎉 تم رفع صورتك الشخصية والتحقق منها بنجاح!");
      } else {
        // Fallback simulate with FileReader base64 block
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const base64Url = e.target.result as string;
            // Save to localStorage simulated sandbox state
            localStorage.setItem(`tajaweed_mock_avatar_${userId}`, base64Url);
            onPhotoUploaded(base64Url);
            onStatusMessage(
              "🎉 تم حفظ وتحديث الصورة بنجاح بوضع المحاكاة المحلي!",
            );
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error("Upload process collapsed:", err);
      onErrorMessage(
        `فشل رفع الصورة الشخصية: ${err.message || "خطأ مجهول أثناء الاتصال بـ Cloud Storage"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const saveCapturedPhoto = async () => {
    if (!previewUrl) return;
    setLoading(true);
    try {
      // Convert Data URL to file blob
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      const file = new File([blob], "captured_profile.png", {
        type: "image/png",
      });
      await handleFileUpload(file);
      setPreviewUrl(null);
    } catch (err) {
      console.error("Failed to process captured image blob:", err);
      onErrorMessage("حدث خطأ أثناء معالجة لقطة الكاميرا.");
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-dashed border-border-primary">
        {/* Avatar Display Frame */}
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-brand-light border-4 border-bg-secondary shadow-md flex items-center justify-center relative">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Captured Snapshot preview"
                className="w-full h-full object-cover"
              />
            ) : currentPhoto ? (
              <img
                src={currentPhoto}
                alt="Active Profile avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-brand-primary text-2xl font-black">✨</div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          {!cameraActive && !previewUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 bg-brand-primary text-white rounded-full shadow-md hover:bg-emerald-800 transition-colors cursor-pointer"
              title="تغيير الصورة الشخصية"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Upload options & instructions */}
        <div className="flex-1 space-y-3 text-right">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <h4 className="font-extrabold text-xs text-text-secondary">
            الصورة الرمزية الحالية
          </h4>
          <p className="text-[11px] text-text-muted leading-relaxed">
            يمكنك التقاط صورة فورية مباشرة باستخدام كاميرا الويب الخاصة بهاتفك
            أو حاسوبك، أو إسقاط صورتك المفضلة هنا لرفعها فورياً وملاءمتها.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {cameraActive ? (
              <button
                type="button"
                onClick={capturePhoto}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-amber-600 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                التقاط لقطة الآن
              </button>
            ) : previewUrl ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveCapturedPhoto}
                  className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  اعتماد وحفظ
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-xl text-xs font-bold hover:bg-bg-tertiary transition-colors cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-brand-primary/20 transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  التقاط عبر الكاميرا
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-xl text-xs font-bold hover:bg-bg-tertiary transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  اختيار من الهاتف / المعرض
                </button>
              </div>
            )}

            {cameraActive && (
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 text-xs rounded-xl font-bold cursor-pointer"
              >
                إلغاء التشغيل
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drag & Drop Canvas */}
      {!cameraActive && !previewUrl && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`h-24 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-text-muted transition-colors ${
            dragOver
              ? "border-brand-primary bg-brand-light/20 text-brand-primary"
              : "border-border-primary hover:border-border-primary hover:bg-slate-50"
          }`}
        >
          <Upload className="w-5 h-5" />
          <span className="text-[10.5px] font-bold">
            أو اسحب ملف الصورة وأسقطه هنا مباشرة
          </span>
        </div>
      )}
    </div>
  );
}
