import { NextRequest, NextResponse } from 'next/server';
import { deleteUserAccount } from '@/db';
import { getSession } from '@/lib/auth';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'TECHNICIAN') {
    return NextResponse.json(
      { error: 'Acceso restringido al rol Técnico' },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 });
  }

  try {
    const result = await deleteUserAccount(userId, session.userId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'No se pudo eliminar el usuario.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ deleted: true, id: userId });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el usuario.' },
      { status: 500 }
    );
  }
}
