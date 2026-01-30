import type { Meta, StoryObj } from '@storybook/react';
import { FigmaPersonalAccessToken } from './FigmaPersonalAccessToken';

const meta: Meta<typeof FigmaPersonalAccessToken> = {
  title: 'Components/FigmaPersonalAccessToken',
  component: FigmaPersonalAccessToken,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FigmaPersonalAccessToken>;

export const Default: Story = {
  args: {},
};
