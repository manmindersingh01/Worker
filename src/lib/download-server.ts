import fs from "fs";
import https from "https";
import path from "path";

export async function downloadAndSavePDFs(urls: string[]): Promise<string[]> {
  const downloadPDF = (url: string): Promise<string> => {
    const fileName = `/tmp/pdf-${Date.now()}-${Math.random()}.pdf`;
    const filePath = path.resolve(fileName);
    const fileStream = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to fetch PDF: ${response.statusCode}`));
            return;
          }

          response.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close();
            resolve(filePath);
          });

          fileStream.on("error", (error) => {
            fs.unlink(filePath, () => {}); // Cleanup the file on error
            reject(error);
          });
        })
        .on("error", (error) => {
          fs.unlink(filePath, () => {}); // Cleanup the file on error
          reject(error);
        });
    });
  };

  const downloadPromises = urls.map((url) => downloadPDF(url));

  try {
    const filePaths = await Promise.all(downloadPromises);
    return filePaths;
  } catch (error) {
    throw new Error(`Failed to download some PDFs: ${error.message}`);
  }
}
