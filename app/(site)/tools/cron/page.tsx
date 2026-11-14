import { CronTool } from "@/components/tools/cron-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("cron");

export default function Page() {
  return (
    <ToolPage slug="cron">
      <CronTool />
    </ToolPage>
  );
}
