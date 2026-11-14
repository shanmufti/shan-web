import { UrlTool } from "@/components/tools/url-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("url-encode");

export default function Page() {
  return (
    <ToolPage slug="url-encode">
      <UrlTool />
    </ToolPage>
  );
}
