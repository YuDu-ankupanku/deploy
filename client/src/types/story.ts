
export interface Story {
  _id: string;
  user: {
    _id: string;
    username: string;
    profileImage: string;
    isVerified?: boolean;
  };
  media: string;
  caption?: string;
  viewers: string[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  hasViewed: boolean;
}

export interface UserStories {
  _id: string;
  username: string;
  profileImage: string;
  isVerified?: boolean;
  stories: Story[];
}
