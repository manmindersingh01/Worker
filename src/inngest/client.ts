import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "worker-rag" });

export type DocumentUploadedEvent = {
  name: "document/uploaded";
  data: { documentId: string };
};
