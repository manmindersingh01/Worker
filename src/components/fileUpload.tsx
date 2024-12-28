"use client";
import { useMutation } from "@tanstack/react-query";
import { File, FileIcon, FileImageIcon } from "lucide-react";

import React from "react";
import { useDropzone } from "react-dropzone";
import { UploadButton } from "~/lib/uploadthing";
import axios from "axios";
import { getUserSession } from "~/hooks/getUser";
import { useAuthStore } from "~/lib/store";
const FileUploadDropZone = () => {
  const { userId } = useAuthStore();
  const { mutate } = useMutation({
    mutationFn: async ({
      url,
      name,
      userId,
    }: {
      url: string[];
      name: string[];
      userId: string;
    }) => {
      const res = await axios.post("/api/pdf-chat", {
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
      {/* <div
        className="flex h-32 flex-col items-center justify-center gap-2"
        {...getRootProps()}
      >
        <input
          {...getInputProps()}
          className="flex h-24 items-center justify-center rounded-xl font-mono"
        />
        <FileIcon size={26} />
        <p className="text-xs">
          Drag 'n' drop some files here, or click to select files
        </p>
      </div> */}
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
              userId: userId,
            },
            {
              onError: (error) => {
                console.error("Error during mutation:", error);
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
                console.log("Mutation success:", data);
              },
              /******  1c7375a5-1a93-40d6-8126-0d33c57c9fbf  *******/
              // ...other options
            },
          );

          // Do something with the response
          console.log("Files: ", res);
          alert("Upload Completed");
        }}
        onUploadError={(error: Error) => {
          // Do something with the error.
          alert(`ERROR! ${error.message}`);
        }}
      />
    </div>
  );
};

export default FileUploadDropZone;
