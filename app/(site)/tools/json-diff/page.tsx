import { JsonDiffTool } from "@/components/tools/json-diff-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("json-diff");

export default function Page() {
  return (
    <ToolPage slug="json-diff">
      <JsonDiffTool />
    </ToolPage>
  );
}
