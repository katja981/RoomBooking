import { Room } from '../domain/room.type';

export interface IRoomApi {
  getRooms: () => Promise<Room[]>;
  getRoom: (id: string) => Promise<Room>;
  createRoom: (room: Room) => Promise<Room>;
  updateRoom: (room: Room) => Promise<Room>;
  deleteRoom: (id: string) => Promise<void>;
}

class RoomApi implements IRoomApi {
  private database: Room[] = [
    {
      id: '1',
      name: 'Room 1',
      capacity: 10,
    },
    {
      id: '2',
      name: 'Room 2',
      capacity: 20,
    },

    {
      id: '3',
      name: 'Room 3',
      capacity: 30,
    },
    {
      id: '4',
      name: 'Room 4',
      capacity: 40,
    },
    {
      id: '5',
      name: 'Room 5',
      capacity: 50,
    },
    {
      id: '6',
      name: 'Room 6',
      capacity: 60,
    },
    {
      id: '7',
      name: 'Room 7',
      capacity: 70,
    },
  ];
  async getRooms(): Promise<Room[]> {
    return this.database;
  }

  async getRoom(id: string): Promise<Room> {
    return this.database.find((room) => room.id === id) as Room;
  }

  async createRoom(room: Room): Promise<Room> {
    this.database.push(room);
    return room;
  }

  async updateRoom(room: Room): Promise<Room> {
    this.database = this.database.map((r) => (r.id === room.id ? room : r));
    return room;
  }

  async deleteRoom(id: string): Promise<void> {
    this.database = this.database.filter((r) => r.id !== id);
  }
}

export const roomApi = new RoomApi();
