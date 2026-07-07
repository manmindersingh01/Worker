import { LogOut } from "lucide-react";
import { signOut } from "~/server/auth";
import { Button } from "./ui/button";

export default function Logout() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/signin" });
      }}
    >
      <Button type="submit" variant="outline" size="sm" className="gap-1.5">
        <LogOut className="h-3.5 w-3.5" aria-hidden />
        Logout
      </Button>
    </form>
  );
}
