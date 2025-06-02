package main

import (
	"bytes"
	"fmt"
	"go/format"
	"go/parser"
	"go/printer"
	"go/token"
	"io/ioutil"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: comment_remover <filepath>")
		os.Exit(1)
	}
	filepath := os.Args[1]

	// Read the source file
	src, err := ioutil.ReadFile(filepath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading file %s: %v\n", filepath, err)
		os.Exit(1)
	}

	// Create a new token file set
	fset := token.NewFileSet()

	// Parse the source code
	// We want to preserve line directives, so we pass parser.ParseComments
	// initially, but printer.Comments will be 0 to strip them.
	// The parser.ParseComments flag itself doesn't prevent stripping by the printer.
	node, err := parser.ParseFile(fset, filepath, src, parser.ParseComments)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing file %s: %v\n", filepath, err)
		os.Exit(1)
	}

	// Configure the printer to strip comments
	// The printer.Comments mode is a bitmask. 0 means strip all comments.
	// Other flags like printer.TabIndent and printer.UseSpaces help with initial formatting.
	cfg := printer.Config{Mode: printer.TabIndent | printer.UseSpaces, Tabwidth: 8}
	
	var buf bytes.Buffer
	err = cfg.Fprint(&buf, fset, node)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error printing AST for file %s: %v\n", filepath, err)
		os.Exit(1)
	}

	// Format the output (equivalent to gofmt)
	formattedSrc, err := format.Source(buf.Bytes())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error formatting source for file %s: %v\n", filepath, err)
		// Output the unformatted source if formatting fails, as it might still be valid
		// and provide more clues than just an error.
		fmt.Print(buf.String())
		os.Exit(1)
	}

	// Print the formatted and comment-stripped code to stdout
	fmt.Print(string(formattedSrc))
}
