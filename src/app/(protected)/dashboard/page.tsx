import { redirect } from "next/navigation";

// No standalone dashboard yet — send users to the workspace.
const Page = () => {
  redirect("/chatroom");
};

export default Page;
