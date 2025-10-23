import { FC, useEffect, useState } from 'react';
import { Room } from '../domain/room.type';
import { roomApi } from '../data/room.api';

export interface RoomListProps {
  display: 'list' | 'grid';
}

export const RoomList: FC<RoomListProps> = ({ display }) => {
  const        [rooms, setRooms] = useState<Room[]>([]);
                const [loading, setLoading] = useState<boolean>(false);
     const [error, setError] = useState<string | null>(null);
           const imNotUsed: any = null

  console.log(display);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const rooms = await roomApi.getRooms();
        setRooms(rooms);
      } catch (error) {
        setError(error as string);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Room List</h1>
      <ul>
        {rooms.map((room) => {
          const mins = Math.max(0, Math.ceil((new Date(room.nextAvailable).getTime() - Date.now()) / 60000));
          const canBook = mins <= 60 && room.capacity >= 2;
          return (
            <li key={room.id}>
              {room.name}
              {canBook ? <span>Can book</span> : <span>Cannot book</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
