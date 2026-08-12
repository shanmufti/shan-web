"use client";

/* eslint-disable react-hooks/static-components -- Component is compiled
   from MDX content data at runtime, not defined during render */

import { useMemo } from "react";
import * as runtime from "react/jsx-runtime";

function useMDXComponent(code: string) {
  return useMemo(() => {
    const fn = new Function(String(code));
    return fn({ ...runtime }).default;
  }, [code]);
}

export function MDXContent({ code }: { code: string }) {
  const Component = useMDXComponent(code);
  return <Component />;
}
