import { JwtTool } from "@/components/tools/jwt-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("jwt");

export default function Page() {
  return (
    <ToolPage slug="jwt">
      <JwtTool />
    </ToolPage>
  );
}
