/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../[userId]/route';
import { GET as GetHistory } from '../[userId]/history/route';
import {
  GET as GetPrediction,
  PATCH as ResolvePrediction,
} from '../prediction/[id]/route';
import { calibrationService } from '@/lib/accuracy/calibration';

function createGetRequest(path: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`));
}

function createPostRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function createPatchRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Calibration API', () => {
  beforeEach(() => {
    calibrationService.reset();
  });

  describe('GET /api/accuracy/calibration/:userId', () => {
    it('returns stats for user', async () => {
      const request = createGetRequest('/api/accuracy/calibration/user-1');
      const response = await GET(request, {
        params: Promise.resolve({ userId: 'user-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userId).toBe('user-1');
      expect(data.totalPredictions).toBeDefined();
      expect(data.accuracy).toBeDefined();
    });

    it('returns 400 for missing userId', async () => {
      const request = createGetRequest('/api/accuracy/calibration/');
      const response = await GET(request, {
        params: Promise.resolve({ userId: '' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/accuracy/calibration/:userId', () => {
    it('creates a prediction', async () => {
      const request = createPostRequest('/api/accuracy/calibration/user-1', {
        taskId: 'task-1',
        taskType: 'code-generation',
        predictedSuccess: true,
        predictedConfidence: 80,
      });

      const response = await POST(request, {
        params: Promise.resolve({ userId: 'user-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.userId).toBe('user-1');
      expect(data.taskId).toBe('task-1');
      expect(data.predictedSuccess).toBe(true);
      expect(data.predictedConfidence).toBe(80);
    });

    it('returns 400 for missing taskId', async () => {
      const request = createPostRequest('/api/accuracy/calibration/user-1', {
        taskType: 'test',
        predictedSuccess: true,
        predictedConfidence: 80,
      });

      const response = await POST(request, {
        params: Promise.resolve({ userId: 'user-1' }),
      });

      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid confidence', async () => {
      const request = createPostRequest('/api/accuracy/calibration/user-1', {
        taskId: 'task-1',
        taskType: 'test',
        predictedSuccess: true,
        predictedConfidence: 150,
      });

      const response = await POST(request, {
        params: Promise.resolve({ userId: 'user-1' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/accuracy/calibration/:userId/history', () => {
    it('returns user history', async () => {
      // Create a prediction first
      calibrationService.createPrediction('user-1', 'task-1', 'test', true, 80);

      const request = createGetRequest('/api/accuracy/calibration/user-1/history');
      const response = await GetHistory(request, {
        params: Promise.resolve({ userId: 'user-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userId).toBe('user-1');
      expect(data.predictions.length).toBe(1);
      expect(data.stats).toBeDefined();
      expect(data.trends).toBeDefined();
    });
  });

  describe('GET /api/accuracy/calibration/prediction/:id', () => {
    it('returns prediction by ID', async () => {
      const prediction = calibrationService.createPrediction(
        'user-1',
        'task-1',
        'test',
        true,
        80
      );

      const request = createGetRequest(`/api/accuracy/calibration/prediction/${prediction.id}`);
      const response = await GetPrediction(request, {
        params: Promise.resolve({ id: prediction.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(prediction.id);
    });

    it('returns 404 for unknown ID', async () => {
      const request = createGetRequest('/api/accuracy/calibration/prediction/unknown');
      const response = await GetPrediction(request, {
        params: Promise.resolve({ id: 'unknown' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/accuracy/calibration/prediction/:id', () => {
    it('resolves a prediction', async () => {
      const prediction = calibrationService.createPrediction(
        'user-1',
        'task-1',
        'test',
        true,
        80
      );

      const request = createPatchRequest(
        `/api/accuracy/calibration/prediction/${prediction.id}`,
        { actualSuccess: true, actualConfidence: 90 }
      );
      const response = await ResolvePrediction(request, {
        params: Promise.resolve({ id: prediction.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.resolvedAt).toBeDefined();
      expect(data.actualSuccess).toBe(true);
      expect(data.wasCorrect).toBe(true);
    });

    it('returns 404 for unknown ID', async () => {
      const request = createPatchRequest('/api/accuracy/calibration/prediction/unknown', {
        actualSuccess: true,
      });
      const response = await ResolvePrediction(request, {
        params: Promise.resolve({ id: 'unknown' }),
      });

      expect(response.status).toBe(404);
    });

    it('returns 400 for missing actualSuccess', async () => {
      const prediction = calibrationService.createPrediction(
        'user-1',
        'task-1',
        'test',
        true,
        80
      );

      const request = createPatchRequest(
        `/api/accuracy/calibration/prediction/${prediction.id}`,
        {}
      );
      const response = await ResolvePrediction(request, {
        params: Promise.resolve({ id: prediction.id }),
      });

      expect(response.status).toBe(400);
    });
  });
});
