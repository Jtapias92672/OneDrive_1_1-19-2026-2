import type { Meta, StoryObj } from '@storybook/react';
import { MendixRepositoryName } from './MendixRepositoryName';

const meta: Meta<typeof MendixRepositoryName> = {
  title: 'Components/MendixRepositoryName',
  component: MendixRepositoryName,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MendixRepositoryName>;

export const Default: Story = {
  args: {},
};
