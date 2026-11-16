import { Router } from 'express'
import { geminiService } from '../services/gemini.service.js'
import { threatCorrelationService } from '../services/threatCorrelation.service.js'
import { logger } from '../utils/logger.js'

export const threatIntelRouter = Router()

/**
 * GET /api/threat-intel
 * Returns correlated threat intelligence incidents and AI classifications.
 *
 * Query Parameters:
 * - agentId: 'all' | '002' | '003' | '000' (default: 'all')
 * - severity: 'all' | 'critical' | 'high' | 'medium' | 'low' | 'informational'
 * - attackType: 'all' | 'Brute Force' | 'Suspicious PowerShell Execution' | etc.
 * - search: free text query across title, MITRE technique, endpoint, explanation
 * - limit: number of items per page (default: 50, max: 100)
 * - offset: pagination start index (default: 0)
 */
threatIntelRouter.get('/threat-intel', async (req, res, next) => {
  try {
    const {
      agentId,
      agent,
      severity,
      attackType,
      search,
      limit = '50',
      offset = '0',
    } = req.query

    const targetAgentId = (agentId || agent || '').toString().trim()
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100)
    const parsedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0)

    logger.debug(`Querying Threat Intelligence (agentId: ${targetAgentId || 'all'}, limit: ${parsedLimit}, offset: ${parsedOffset})`)

    // Ensure initial analysis has occurred
    let storedIncidents = threatCorrelationService.getIncidents(targetAgentId || 'all')
    if (storedIncidents.length === 0) {
      logger.info('No existing threat incidents found on disk; triggering initial correlation.')
      await threatCorrelationService.correlateAndAnalyze(targetAgentId || 'all')
      storedIncidents = threatCorrelationService.getIncidents(targetAgentId || 'all')
    }

    const filtered = threatCorrelationService.getIncidents(targetAgentId || 'all', {
      severity,
      attackType,
      search,
    })

    const totalCount = filtered.length
    const pagedItems = filtered.slice(parsedOffset, parsedOffset + parsedLimit)
    const metrics = threatCorrelationService.getMetrics(storedIncidents)

    // Check if any incident used Gemini or heuristic
    const hasGeminiIncidents = storedIncidents.some((i) => i.analysisSource === 'gemini')

    return res.json({
      affected_items: pagedItems,
      total_affected_items: totalCount,
      offset: parsedOffset,
      limit: parsedLimit,
      metrics,
      status: {
        geminiConfigured: geminiService.isConfigured(),
        model: geminiService.getModel(),
        lastAnalyzed: storedIncidents[0]?.analyzedAt || new Date().toISOString(),
        analysisMode: hasGeminiIncidents ? 'gemini' : 'heuristic',
        warning: !geminiService.isConfigured()
          ? 'GEMINI_API_KEY is not configured in backend/.env. Operating in verified heuristic correlation mode.'
          : null,
      },
    })
  } catch (err) {
    logger.error(`Error in /api/threat-intel: ${err.message}`)
    return next(err)
  }
})

/**
 * GET /api/threat-intel/:id
 * Returns single incident details including full list of correlated raw source alerts.
 */
threatIntelRouter.get('/threat-intel/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Incident ID required' })
    }

    const cleanId = id.trim()
    const allIncidents = threatCorrelationService.getIncidents('all')
    const match = allIncidents.find((inc) => inc.id === cleanId)

    if (!match) {
      return res.status(404).json({ error: `Threat incident with ID "${cleanId}" not found` })
    }

    return res.json(match)
  } catch (err) {
    logger.error(`Error fetching incident ${req.params.id}: ${err.message}`)
    return next(err)
  }
})

/**
 * POST /api/threat-intel/analyze
 * Manually triggers fresh event correlation and AI threat intelligence analysis.
 */
threatIntelRouter.post('/threat-intel/analyze', async (req, res, next) => {
  try {
    const { agentId = 'all', force = true } = req.body || {}
    logger.info(`Manual threat analysis requested for agent: ${agentId} (force: ${force})`)

    const updatedIncidents = await threatCorrelationService.correlateAndAnalyze(agentId, { force: Boolean(force) })
    const metrics = threatCorrelationService.getMetrics(updatedIncidents)

    return res.json({
      success: true,
      message: `Threat analysis completed successfully for ${agentId}.`,
      totalIncidents: updatedIncidents.length,
      metrics,
      status: {
        geminiConfigured: geminiService.isConfigured(),
        model: geminiService.getModel(),
        lastAnalyzed: new Date().toISOString(),
        analysisMode: geminiService.isConfigured() ? 'gemini' : 'heuristic',
      },
    })
  } catch (err) {
    logger.error(`Error executing manual threat analysis: ${err.message}`)
    return next(err)
  }
})

/**
 * POST /api/threat-intel/reanalyze/:id
 * Reanalyzes a single existing incident using Gemini AI while preserving history.
 */
threatIntelRouter.post('/threat-intel/reanalyze/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Incident ID required' })
    }

    logger.info(`Single incident reanalysis requested for: ${id}`)
    const updated = await threatCorrelationService.reanalyzeIncident(id.trim())

    if (!updated) {
      return res.status(404).json({ error: `Threat incident "${id}" not found` })
    }

    return res.json({
      success: true,
      message: `Incident ${id} reanalyzed successfully.`,
      incident: updated,
    })
  } catch (err) {
    logger.error(`Error reanalyzing incident ${req.params.id}: ${err.message}`)
    return next(err)
  }
})
