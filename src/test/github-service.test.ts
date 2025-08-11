import { strict as assert } from 'assert';
import { GitHubService } from '../services';

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(() => {
    service = new GitHubService();
  });

  it('should instantiate without error', () => {
    assert.ok(service);
  });

  it('should return false for isGitRepository by default', async () => {
    const result = await service.isGitRepository();
    assert.strictEqual(result, false);
  });
});
