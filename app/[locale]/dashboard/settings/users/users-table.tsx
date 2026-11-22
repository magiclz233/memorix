'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { ListTabs } from '@/app/ui/shared/list-tabs';
import { ListPagination } from '@/app/ui/shared/list-pagination';
import { useListPagination } from '@/app/ui/shared/use-list-pagination';
import {
  DeleteUserButton,
  SetRoleButton,
  ToggleBanButton,
} from './user-actions';

export type UserRow = {
  id: number;
  name: string | null;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date | string | null;
};

type UserStatusTab = 'all' | 'admin' | 'banned';

const formatDate = (value: Date | string | null | undefined, locale: string) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

type UsersTableProps = {
  users: UserRow[];
  locale: string;
  currentUserId: number | null;
};

export function UsersTable({ users, locale, currentUserId }: UsersTableProps) {
  const t = useTranslations('dashboard.settings.users');
  const [status, setStatus] = useState<UserStatusTab>('all');

  const filteredUsers = users.filter((user) => {
    if (status === 'admin') return user.role === 'admin';
    if (status === 'banned') return Boolean(user.banned);
    return true;
  });

  const pagination = useListPagination(filteredUsers.length);
  const pagedUsers = pagination.slice(filteredUsers);

  const handleStatusChange = (value: string) => {
    setStatus(value as UserStatusTab);
    pagination.setPage(1);
  };

  return (
    <div className='space-y-4'>
      <ListTabs
        size='sm'
        items={[
          { value: 'all', label: t('status.all'), count: users.length },
          {
            value: 'admin',
            label: t('status.admin'),
            count: users.filter((user) => user.role === 'admin').length,
          },
          {
            value: 'banned',
            label: t('status.banned'),
            count: users.filter((user) => user.banned).length,
          },
        ]}
        value={status}
        onChange={handleStatusChange}
        ariaLabel={t('table.status')}
      />

      <div className='rounded-2xl border border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60'>
        {users.length === 0 ? (
          <div className='p-6 text-sm text-zinc-500 dark:text-zinc-400'>
            {t('noUsers')}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className='p-6 text-sm text-zinc-500 dark:text-zinc-400'>
            {t('noUsers')}
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead className='border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400'>
                <tr>
                  <th className='px-6 py-3'>{t('table.user')}</th>
                  <th className='px-6 py-3'>{t('table.status')}</th>
                  <th className='px-6 py-3'>{t('table.registeredAt')}</th>
                  <th className='px-6 py-3 text-right'>{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-zinc-200 dark:divide-zinc-800'>
                {pagedUsers.map((user) => {
                  const role = user.role ?? 'user';
                  const isBanned = Boolean(user.banned);
                  const isSelf =
                    currentUserId !== null && currentUserId === user.id;
                  const isSelfAdmin = isSelf && role === 'admin';
                  const roleLabel =
                    role === 'admin' ? t('role.admin') : t('role.user');

                  return (
                    <tr
                      key={user.id}
                      className='bg-white/60 text-zinc-700 hover:bg-white dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-900/40'
                    >
                      <td className='px-6 py-4'>
                        <div className='flex flex-col'>
                          <span className='font-medium text-zinc-900 dark:text-zinc-100'>
                            {user.name || user.email}
                          </span>
                          <span className='text-xs text-zinc-500 dark:text-zinc-400'>
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='flex flex-wrap gap-2'>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                              role === 'admin'
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200'
                                : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300',
                            )}
                          >
                            {roleLabel}
                          </span>
                          {isBanned ? (
                            <span className='inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'>
                              {t('status.banned')}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className='px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400'>
                        {formatDate(user.createdAt, locale)}
                      </td>
                      <td className='px-6 py-4 text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <SetRoleButton
                            userId={user.id}
                            currentRole={role === 'admin' ? 'admin' : 'user'}
                            disabled={isSelfAdmin}
                          />
                          <ToggleBanButton
                            userId={user.id}
                            isBanned={isBanned}
                            disabled={isSelf}
                          />
                          <DeleteUserButton
                            userId={user.id}
                            disabled={isSelf}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredUsers.length > 0 ? (
        <ListPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalCount={filteredUsers.length}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      ) : null}
    </div>
  );
}
