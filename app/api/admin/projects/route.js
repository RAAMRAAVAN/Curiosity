import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { buildPaginationMeta, containsFilter, parsePagination } from '@/lib/pagination';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'projects.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const pagination = parsePagination(req);
    if (pagination) {
      const where = pagination.search
        ? { OR: [{ name: containsFilter(pagination.search) }, { suffix: containsFilter(pagination.search) }] }
        : {};
      const [total, projects] = await Promise.all([
        prisma.project.count({ where }),
        prisma.project.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: pagination.skip,
          take: pagination.take,
        }),
      ]);
      return ApiResponse.paginated(projects, buildPaginationMeta(total, pagination));
    }

    return ApiResponse.success(await prisma.project.findMany({ orderBy: { name: 'asc' } }));
  } catch (error) {
    console.error('Load projects error:', error);
    return ApiResponse.error('Unable to load projects.', 500, error);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'projects.create');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const suffix = String(body?.suffix || '').trim();
    if (!name || !suffix) return ApiResponse.error('Project name and suffix are required.', 400);

    const project = await prisma.project.create({ data: { name, suffix } });
    return ApiResponse.success(project, 'Project created.', 201);
  } catch (error) {
    if (error?.code === 'P2002') {
      const field = String(error?.meta?.target || '');
      return ApiResponse.error(field.includes('suffix') ? 'This project suffix is already in use.' : 'A project with this name already exists.', 409);
    }
    console.error('Create project error:', error);
    return ApiResponse.error('Unable to create project.', 500, error);
  }
}
