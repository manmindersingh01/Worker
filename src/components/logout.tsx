import { signOut } from "~/server/auth";
import ShimmerButton from "./ui/shimmer-button";
import { Button } from "./ui/button";

export default function Logout() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <Button>Logout</Button>
    </form>
  );
}
