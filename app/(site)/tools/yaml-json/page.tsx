import { YamlJsonTool } from "@/components/tools/yaml-json-tool";
import { ToolPage, toolMetadata } from "@/components/tools/tool-page";

export const metadata = toolMetadata("yaml-json");

export default function Page() {
  return (
    <ToolPage slug="yaml-json">
      <YamlJsonTool />
    </ToolPage>
  );
}
