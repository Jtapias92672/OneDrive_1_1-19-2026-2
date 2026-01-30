import type { Meta, StoryObj } from '@storybook/react';
import { MendixImportModulePackageName } from './MendixImportModulePackageName';

const meta: Meta<typeof MendixImportModulePackageName> = {
  title: 'Components/MendixImportModulePackageName',
  component: MendixImportModulePackageName,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MendixImportModulePackageName>;

export const Default: Story = {
  args: {},
};
