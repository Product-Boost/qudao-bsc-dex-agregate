import { Compass } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { ButtonLink, Card, Empty } from "../components/ui";
import { useT } from "../i18n";

export default function NotFound() {
  const { t } = useT();
  return (
    <Page className="max-w-3xl">
      <Card>
        <Empty icon={<Compass className="size-6" />} title={t("This page doesn't exist")} action={<ButtonLink to="/app">{t("Go to the app")}</ButtonLink>}>
          {t("The link may be old, or mistyped.")}
        </Empty>
      </Card>
    </Page>
  );
}
