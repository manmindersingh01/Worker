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
      <ShimmerButton type="submit" className="gap-2.5 shadow-2xl">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#5865F2]" aria-hidden>
          <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3a13.7 13.7 0 0 0-.6 1.3 18.3 18.3 0 0 0-5.5 0A13.2 13.2 0 0 0 8.6 3 19.7 19.7 0 0 0 3.7 4.4C.6 9 .2 13.5.4 17.9a19.9 19.9 0 0 0 6 3 14.7 14.7 0 0 0 1.3-2.1 12.9 12.9 0 0 1-2-1c.2-.1.3-.2.5-.3a14.2 14.2 0 0 0 12 0l.5.3a12.8 12.8 0 0 1-2 1 14.5 14.5 0 0 0 1.3 2.1 19.8 19.8 0 0 0 6-3c.4-5.1-.7-9.6-3.2-13.5ZM8.3 15.3c-1.2 0-2.1-1.1-2.1-2.4S7.1 10.5 8.3 10.5s2.2 1.1 2.1 2.4-.9 2.4-2.1 2.4Zm7.4 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4-.9 2.4-2.1 2.4Z" />
        </svg>
        <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
          Continue with Discord
        </span>
      </ShimmerButton>
    </form>
  );
}
