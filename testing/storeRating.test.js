const { storeRating,fetchRatings } = require('../controllers/rating.c'); 
const { Bookings, Rating } = require('../models'); // Import your models

describe('storeRating function', () => {
  // Mocking req, res, and next
  const req = {
    user: { _id: 'userId' },
    body: {
      bookingId: 'bookingId',
      review: 'Great service!',
      rating: 5,
      date: '2024-05-15',
    },
    params: {},
    query: {},
    reqId: 'reqId',
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test case when request data is valid
  it('should store rating when request data is valid', async () => {
    // Mocking findOne result
    Bookings.findOne = jest.fn().mockResolvedValue({
      partnerId: 'partnerId',
      userId: 'userId',
    });
    // Mocking findOneAndUpdate result
    Rating.findOneAndUpdate = jest.fn().mockResolvedValue({
      _id: 'ratingId',
      ...req.body,
    });

    await storeRating(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Rating Submitted Successfully',
      data: { _id: 'ratingId', ...req.body },
    });
  });

  
  it('should return an error when booking ID is missing', async () => {
    const invalidReq = { ...req, body: { ...req.body, bookingId: undefined } };1

    await storeRating(invalidReq, res, next);
  })

  // Test case when rating is invalid
  it('should return an error when rating is invalid', async () => {
    const invalidReq = { ...req, body: { ...req.body, rating: 'invalid' } };

    await storeRating(invalidReq, res, next);

  })



  // Test case for database error
  it('should return an error when there is a database error', async () => {
    // Mocking findOne result to throw an error
    Bookings.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

    await storeRating(req, res, next);

    expect(next).toHaveBeenCalledWith(new Error('Database error'));
  });
  })

describe('fetchRatings function', () => {
  // Mocking req, res, and next
  const req = {
    user: { _id: 'userId' },
    body: {},
    params: {},
    query: {},
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test case when ratings are found
  it('should fetch ratings when data exists', async () => {
    // Mocking find result
    Rating.find = jest.fn().mockResolvedValue([
      { rating: 4 },
      { rating: 5 },
      { rating: 3 },
    ]);

    await fetchRatings(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Rating data fetch  Successfully',
      totalRating: 12, // Sum of ratings (4 + 5 + 3)
      avgRating: 4, // Average rating (12 / 3)
      reviewsCount: 3, // Total number of reviews
      reviewsData: [
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
      ],
    });
  });

  // Test case when no ratings are found
  it('should handle the scenario when no ratings are found', async () => {
    // Mocking find result
    Rating.find = jest.fn().mockResolvedValue([]);

    await fetchRatings(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Rating data fetch  Successfully',
      totalRating: 0,
      avgRating: NaN,
      reviewsCount: 0,
      reviewsData: [],
    });
  });

  // Test case for invalid user ID
  it('should handle the scenario when user ID is invalid', async () => {
    req.user._id = null; 
    await fetchRatings(req, res, next);

  });

  // Test case for database error
  it('should handle the scenario when there is a database error', async () => {
    Rating.find = jest.fn().mockRejectedValue(new Error('Database error'));

    await fetchRatings(req, res, next);

  });
})