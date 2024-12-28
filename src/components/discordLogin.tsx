import { signIn } from "~/server/auth";
import ShimmerButton from "./ui/shimmer-button";

export default function SignIn() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("discord");
      }}
    >
      <ShimmerButton type="submit" className="shadow-2xl">
        <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
          Continue with discord
        </span>
      </ShimmerButton>
    </form>
  );
}
