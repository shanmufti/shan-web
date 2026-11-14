import { HashTool } from "@/components/tools/hash-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("hash");

export default function Page() {
  return (
    <ToolPage slug="hash">
      <HashTool />
    </ToolPage>
  );
}
