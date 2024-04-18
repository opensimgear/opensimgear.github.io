---@diagnostic disable: undefined-global

local function getRelativeDir()
  local path = vim.fn.expand("%:p:h:t")
  return path:gsub("src/content/docs/", "")
end

return {
  default = {
    dir_path = function()
      return "src/assets/images/" .. getRelativeDir()
    end,
  },
  filetypes = {
    markdown = {
      template = function()
        return "![$CURSOR](~/assets/images/" .. getRelativeDir() .. "/$FILE_NAME)"
      end,
    },
  },
}
