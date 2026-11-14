import { UuidTool } from "@/components/tools/uuid-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("uuid");

export default function Page() {
  return (
    <ToolPage slug="uuid">
      <UuidTool />
    </ToolPage>
  );
}
