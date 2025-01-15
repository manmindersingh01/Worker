"use client";
import { useMutation } from "@tanstack/react-query";
import { File, FileIcon, FileImageIcon } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import React from "react";
import { useDropzone } from "react-dropzone";
import { UploadButton } from "~/lib/uploadthing";
import axios from "axios";

import { useRouter } from "next/navigation";
const FileUploadDropZone = ({ setLoading }) => {
  const router = useRouter();
  const { mutate } = useMutation({
    mutationFn: async ({ url, name }: { url: string[]; name: string[] }) => {
      toast(
        "Uploading files... , this can take time depending on the file size",
      );
      setLoading(true);
      console.log("url", url, "name", name);

      const res = await axios.post("/api/upload", {
        url,
        name,
      });
      return res.data;
    },
  });
  const [files, setFiles] = React.useState([]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 3,

    onDrop: (acceptedFiles) => {
      console.log("Received files:", acceptedFiles);
    },
  });

  return (
    <div className="flex cursor-pointer items-center justify-center rounded-xl border border-primary bg-blue-400 p-4">
      <UploadButton
        endpoint="imageUploader"
        onClientUploadComplete={(res) => {
          const filesName = [];
          const fileUrl = [];
          res.map((val) => filesName.push(val.name));
          res.map((val) => fileUrl.push(val.url));

          mutate(
            {
              url: fileUrl,
              name: filesName,
            },
            {
              onError: (error) => {
                console.error("Error during mutation okkk:", error.message);
              },
              onSettled: () => {
                console.log("Mutation finished");
              },
              /*************  ✨ Codeium Command 🌟  *************/
              /**
               * Called when the mutation is successful.
               * @param {any} data - The response data from the server.
               */
              onSuccess: (data) => {
                toast.success("Files uploaded successfully!");
                setLoading(false);
                router.push(`/pdfchat/${data.id}`);
                console.log("Mutation success data of pdfs:", data);
              },

              /******  1c7375a5-1a93-40d6-8126-0d33c57c9fbf  *******/
              // ...other options
            },
          );
        }}
        onUploadError={(error: Error) => {
          // Do something with the error.
          alert(`ERROR while uploading! ${error.message}`);
        }}
      />
      <Toaster />
    </div>
  );
};

export default FileUploadDropZone;
