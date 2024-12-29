import React from "react";

type Props = {
  pdfUrl: string[];
};

const PdfView = ({ pdfUrl }: Props) => {
  console.log(pdfUrl, "---------pdfUrl");

  return (
    <div className="flex w-full flex-col gap-2">
      {pdfUrl.map((url, index) => (
        <div key={index} className="h-96 w-full">
          <iframe
            src={`https://docs.google.com/gview?url=${url}&embedded=true`}
            className="h-screen w-full"
            title="pdf"
          ></iframe>
          <h1>pdfs</h1>
        </div>
      ))}
    </div>
  );
};

export default PdfView;
