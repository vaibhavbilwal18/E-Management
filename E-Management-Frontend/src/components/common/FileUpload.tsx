import { useRef, type ChangeEvent } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

const ACCEPTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface FileUploadProps {
  onSelect: (file: File) => void;
  isUploading?: boolean;
}

export function FileUpload({ onSelect, isUploading }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast.error("Only PDF, JPG, and PNG files are allowed");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("File exceeds the 5MB limit");
      return;
    }

    onSelect(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Uploading..." : "Upload file"}
      </Button>
    </div>
  );
}
