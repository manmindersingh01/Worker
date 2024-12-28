import { redirect } from "next/navigation";
import React from "react";
import SignIn from "~/components/discordLogin";
import SignInWithGoogle from "~/components/googleLogin";

import DotPattern from "~/components/ui/dot-pattern";
import { VelocityScroll } from "~/components/ui/scroll-based-velocity";

import SparklesText from "~/components/ui/sparkles-text";
import { getUserSession } from "~/hooks/getUser";
import { useAuthStore } from "~/lib/store";
import { cn } from "~/lib/utils";

async function page() {
  const session = await getUserSession();
  console.log(session);

  if (session?.user) {
    redirect("/chatroom");
  }
  return (
    <div>
      <div className="flex h-screen w-full bg-white">
        <div className="relative flex h-[500px] w-full flex-col items-center justify-center rounded-lg">
          <p className="z-10 mb-40 whitespace-pre-wrap text-center text-5xl font-medium tracking-tighter text-black dark:text-white">
            <SparklesText text="Never let anyone spoil your cheating" />
          </p>
          <div className="absolute top-56 flex gap-4">
            <SignIn />
            <SignInWithGoogle />
          </div>

          <div className="border-3 absolute top-72 flex w-[60%] items-center justify-center rounded-lg border-red-600 bg-black">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              width={"100%"}
              className="pointer-events-none m-2 h-auto object-cover"
            >
              <source src="/hero.mp4" type="video/mp4" />
              <track
                src="/path/to/captions.vtt"
                kind="subtitles"
                srcLang="en"
                label="English"
              />
              Your browser does not support the video tag.
            </video>
          </div>

          <DotPattern
            className={cn(
              "[mask-image:radial-gradient(300px_circle_at_center,white,transparent)]",
            )}
          />
        </div>
      </div>
      <div className="mt-32 p-10">
        <VelocityScroll>
          {" "}
          Uplaod multiple pdfs and ask questions{" "}
        </VelocityScroll>
        <VelocityScroll>
          {" "}
          Do intractive chat with boot and ask questions{" "}
        </VelocityScroll>
      </div>
    </div>
  );
}

export default page;
