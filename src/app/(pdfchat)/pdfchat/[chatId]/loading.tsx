import React from "react";

const LoadingPage = () => {
  return (
    <div className="flex h-screen overflow-scroll">
      <div className="flex max-h-screen w-full overflow-scroll">
        {/* PDF view loading skeleton */}
        <div className="max-h-screen flex-[3] overflow-scroll p-4">
          <div className="h-full w-full animate-pulse rounded-lg bg-gray-200"></div>
        </div>
        {/* Chat loading skeleton */}
        <div className="h-screen flex-[3] overflow-scroll border-l-4 p-4">
          <div className="space-y-4">
            <div className="h-10 w-3/4 animate-pulse rounded bg-gray-200"></div>
            <div className="h-10 w-1/2 animate-pulse rounded bg-gray-200"></div>
            <div className="h-10 w-2/3 animate-pulse rounded bg-gray-200"></div>
            <div className="h-10 w-3/4 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
