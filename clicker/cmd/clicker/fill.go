package main

import (
	"github.com/spf13/cobra"
)

func newFillCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "fill [selector] [text]",
		Short: "Clear an input field and type new text",
		Example: `  vibium fill "input[name=email]" "user@example.com"
  # Clear the field and type new value
  vibium fill "#search" "vibium"
  # Replace search field contents`,
		DisableFlagParsing: true,
		Args:               cobra.ExactArgs(2),
		Run: func(cmd *cobra.Command, args []string) {
			selector := args[0]
			text := args[1]
			result, err := daemonCall("browser_fill", map[string]interface{}{
				"selector": selector,
				"value":    text,
			})
			if err != nil {
				printError(err)
				return
			}
			printResult(result)
		},
	}
	return cmd
}
