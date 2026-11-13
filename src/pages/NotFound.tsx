import { Compass } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { ButtonLink, Card, Empty } from "../components/ui";

export default function NotFound() {
  return (
    <Page className="max-w-3xl">
      <Card>
        <Empty icon={<Compass className="size-6" />} title="This page doesn't exist" action={<ButtonLink to="/app">Go to the app</ButtonLink>}>
          The link may be old, or mistyped.
        </Empty>
      </Card>
    </Page>
  );
}
