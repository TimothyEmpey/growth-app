import { Text, View } from 'react-native';
import { Body, Card, Label, Sheet } from './ui';
import { useColors } from '@/providers/appearance';

export type LegalSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

export function LegalDocument({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle: string;
  sections: LegalSection[];
}) {
  const C = useColors();
  return (
    <Sheet title={title} subtitle={subtitle}>
      {sections.map((section) => (
        <Card key={section.title} style={{ gap: 12 }}>
          <Label color={C.blue}>{section.title}</Label>
          {section.paragraphs.map((paragraph) => (
            <Body key={paragraph}>{paragraph}</Body>
          ))}
          {section.items?.map((item) => (
            <View key={item} style={{ flexDirection: 'row', gap: 10 }}>
              <Text selectable style={{ color: C.blue, fontSize: 15, lineHeight: 22 }}>
                •
              </Text>
              <Text selectable style={{ color: C.muted, fontSize: 14, lineHeight: 22, flex: 1 }}>
                {item}
              </Text>
            </View>
          ))}
        </Card>
      ))}
    </Sheet>
  );
}
