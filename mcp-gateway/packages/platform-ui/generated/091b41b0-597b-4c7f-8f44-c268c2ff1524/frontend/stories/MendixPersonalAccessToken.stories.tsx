import type { Meta, StoryObj } from '@storybook/react';
import { MendixPersonalAccessToken } from './MendixPersonalAccessToken';

const meta: Meta<typeof MendixPersonalAccessToken> = {
  title: 'Components/MendixPersonalAccessToken',
  component: MendixPersonalAccessToken,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MendixPersonalAccessToken>;

export const Default: Story = {
  args: {},
};
