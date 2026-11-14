import { JsonTool } from "@/components/tools/json-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("json");

export default function Page() {
  return (
    <ToolPage slug="json">
      <JsonTool />
    </ToolPage>
  );
}
