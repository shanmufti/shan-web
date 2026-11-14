import { TimestampTool } from "@/components/tools/timestamp-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("timestamp");

export default function Page() {
  return (
    <ToolPage slug="timestamp">
      <TimestampTool />
    </ToolPage>
  );
}
