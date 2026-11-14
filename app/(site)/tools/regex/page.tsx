import { RegexTool } from "@/components/tools/regex-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("regex");

export default function Page() {
  return (
    <ToolPage slug="regex">
      <RegexTool />
    </ToolPage>
  );
}
