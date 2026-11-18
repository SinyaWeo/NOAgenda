import { SearchController } from '../search.controller';
import { SearchService } from '../search.service';
import { NodeType } from '../../node/node.entity';
import { NodeService } from '../../node/node.service';
import { asMock, authReq, type Mocks } from '../../../common/__tests__/test-utils';

describe('SearchService', () => {
  it('queries tasks and projects scoped to the user with limit 10', async () => {
    const nodes: Mocks = {
      findAll: jest.fn(async (f: { type: NodeType }) => (f.type === NodeType.TASK ? [{ id: 1 }] : [{ id: 2 }])),
    };
    const out = await new SearchService(asMock<NodeService>(nodes)).search(7, 'foo');
    expect(nodes.findAll).toHaveBeenCalledWith({ userId: 7, type: NodeType.TASK, search: 'foo', limit: 10 });
    expect(nodes.findAll).toHaveBeenCalledWith({ userId: 7, type: NodeType.PROJECT, search: 'foo', limit: 10 });
    expect(out).toEqual({ tasks: [{ id: 1 }], projects: [{ id: 2 }] });
  });

  it('propagates errors from the node service', async () => {
    const nodes: Mocks = { findAll: jest.fn().mockRejectedValue(new Error('db')) };
    await expect(new SearchService(asMock<NodeService>(nodes)).search(7, 'foo')).rejects.toThrow('db');
  });
});

describe('SearchController', () => {
  let service: Mocks;
  let controller: SearchController;
  const req = authReq(7);

  beforeEach(() => {
    service = { search: jest.fn(async () => ({ tasks: [1], projects: [] })) };
    controller = new SearchController(asMock<SearchService>(service));
  });

  it.each([undefined, null, 42, ['ab'], { a: 1 }, '', ' a ', 'a', '   '])(
    'returns empty results without searching for q=%j',
    async (q) => {
      await expect(controller.search(q, req)).resolves.toEqual({ tasks: [], projects: [] });
      expect(service.search).not.toHaveBeenCalled();
    },
  );

  it('trims the query and uses the authenticated user', async () => {
    await controller.search('  hello  ', req);
    expect(service.search).toHaveBeenCalledWith(7, 'hello');
  });

  it('truncates overly long queries to 100 chars', async () => {
    await controller.search('x'.repeat(500), req);
    expect(service.search).toHaveBeenCalledWith(7, 'x'.repeat(100));
  });
});
