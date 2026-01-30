import type { Meta, StoryObj } from '@storybook/react';
import { ButtonDanger } from './ButtonDanger';

const meta: Meta<typeof ButtonDanger> = {
  title: 'Components/ButtonDanger',
  component: ButtonDanger,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ButtonDanger>;

export const Default: Story = {
  args: {},
};
