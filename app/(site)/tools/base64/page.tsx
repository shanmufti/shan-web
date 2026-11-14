import { Base64Tool } from "@/components/tools/base64-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("base64");

export default function Page() {
  return (
    <ToolPage slug="base64">
      <Base64Tool />
    </ToolPage>
  );
}
