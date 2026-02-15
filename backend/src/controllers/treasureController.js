const Treasure = require('../models/Treasure');

/**
 * Get all treasures on the map.
 * Returns every treasure location for the frontend to render on the map.
 * No authentication required — anyone can see where the treasures are.
 * @route   GET /api/treasures
 * @returns {Object} Array of all treasure objects with their coordinates and details
 */
exports.getTreasures = async (req, res, next) => {
    try {
        const treasures = await Treasure.find();
        res.status(200).json({
            success: true,
            count: treasures.length,
            data: treasures
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get a single treasure by its ID.
 * Used when a player taps on a treasure marker to view its full details and clue.
 * @route   GET /api/treasures/:id
 * @param   {string} req.params.id - The treasure's MongoDB ObjectId
 * @returns {Object} The full treasure object
 */
exports.getTreasure = async (req, res, next) => {
    try {
        const treasure = await Treasure.findById(req.params.id);

        if (!treasure) {
            return res.status(404).json({
                success: false,
                error: 'Treasure not found'
            });
        }

        res.status(200).json({
            success: true,
            data: treasure
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new treasure (public route version).
 * Note: The admin panel uses adminController.createTreasure instead.
 * @route   POST /api/treasures
 * @param   {Object} req.body - Treasure data (name, description, clue, lat, lng, points, category)
 * @access  Protected
 */
exports.createTreasure = async (req, res, next) => {
    try {
        const treasure = await Treasure.create(req.body);
        res.status(201).json({
            success: true,
            data: treasure
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Update an existing treasure's information.
 * Accepts partial updates — only send the fields you want to change.
 * @route   PUT /api/treasures/:id
 * @param   {string} req.params.id - The treasure's MongoDB ObjectId
 * @param   {Object} req.body - Fields to update
 * @access  Protected
 */
exports.updateTreasure = async (req, res, next) => {
    try {
        const treasure = await Treasure.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!treasure) {
            return res.status(404).json({
                success: false,
                error: 'Treasure not found'
            });
        }

        res.status(200).json({
            success: true,
            data: treasure
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete a treasure from the database.
 * @route   DELETE /api/treasures/:id
 * @param   {string} req.params.id - The treasure's MongoDB ObjectId
 * @access  Protected
 */
exports.deleteTreasure = async (req, res, next) => {
    try {
        const treasure = await Treasure.findByIdAndDelete(req.params.id);

        if (!treasure) {
            return res.status(404).json({
                success: false,
                error: 'Treasure not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};
