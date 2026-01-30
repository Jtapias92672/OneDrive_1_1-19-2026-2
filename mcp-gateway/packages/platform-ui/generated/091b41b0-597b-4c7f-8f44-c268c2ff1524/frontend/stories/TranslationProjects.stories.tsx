import type { Meta, StoryObj } from '@storybook/react';
import { TranslationProjects } from './TranslationProjects';

const meta: Meta<typeof TranslationProjects> = {
  title: 'Components/TranslationProjects',
  component: TranslationProjects,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TranslationProjects>;

export const Default: Story = {
  args: {},
};
