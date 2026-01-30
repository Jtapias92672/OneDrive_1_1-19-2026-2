import type { Meta, StoryObj } from '@storybook/react';
import { TranslationProjectDetails } from './TranslationProjectDetails';

const meta: Meta<typeof TranslationProjectDetails> = {
  title: 'Components/TranslationProjectDetails',
  component: TranslationProjectDetails,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TranslationProjectDetails>;

export const Default: Story = {
  args: {},
};
